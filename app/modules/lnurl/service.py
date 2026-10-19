"""Regras da ponte LNURL: valida o que o cliente pede e o que o servico responde.

O cliente nunca manda URL (RN-LNURL-004): a API monta o caminho `.well-known` a partir do
endereco e usa o `callback` que o proprio servico informou. Nada e guardado e o log so tem o
dominio (RN-LNURL-008).
"""

import json
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit

from app.core.exceptions import DomainValidationError, UpstreamError
from app.core.logging import get_logger
from app.modules.lnurl.repository import (
    HostRecusadoError,
    LnurlRepository,
    RespostaInvalidaError,
)
from app.modules.lnurl.schemas import (
    LnurlConsultaRead,
    LnurlFaturaCreate,
    LnurlFaturaRead,
)

logger = get_logger(__name__)

ENDERECO = re.compile(r"^[a-z0-9._+-]{1,64}@((?:[a-z0-9-]{1,63}\.)+[a-z]{2,63})$")
CODIGO_LNURL = re.compile(r"^lnurl1[a-z0-9]{1,1990}$", re.IGNORECASE)
KIND_PEDIDO_DE_ZAP = 9734


@dataclass(frozen=True)
class _Servico:
    host: str
    url: str
    callback: str
    min_ms: int
    max_ms: int
    aceita_zap: bool
    nostr_pubkey: str | None
    comentario_max: int


class LnurlService:
    def __init__(self, repository: LnurlRepository) -> None:
        self.repository = repository

    async def consultar(self, endereco: str) -> LnurlConsultaRead:
        servico = await self._consultar(endereco)
        return LnurlConsultaRead(
            url=servico.url,
            min_sats=-(-servico.min_ms // 1000),  # arredonda para cima
            max_sats=servico.max_ms // 1000,
            aceita_zap=servico.aceita_zap,
            nostr_pubkey=servico.nostr_pubkey,
            comentario_max=servico.comentario_max,
        )

    async def fatura(self, dados: LnurlFaturaCreate) -> LnurlFaturaRead:
        servico = await self._consultar(dados.endereco)
        milissats = dados.sats * 1000
        # RN-LNURL-006: o valor tem de caber nos limites declarados pelo servico.
        if not servico.min_ms <= milissats <= servico.max_ms:
            raise DomainValidationError("Valor fora dos limites do servico Lightning")

        consulta: dict[str, str] = {"amount": str(milissats)}
        if dados.nostr is not None:
            self._validar_pedido_de_zap(dados.nostr, servico)
            consulta["nostr"] = dados.nostr
            if dados.lnurl and CODIGO_LNURL.match(dados.lnurl):
                consulta["lnurl"] = dados.lnurl
        if dados.comentario and servico.comentario_max > 0:
            consulta["comment"] = dados.comentario[: servico.comentario_max]

        # RN-LNURL-004: so o callback que o proprio servico informou.
        partes = urlsplit(servico.callback)
        host = self._host_https(partes.hostname, partes.scheme, partes.port, partes.username)
        existentes = parse_qsl(partes.query, keep_blank_values=True)
        caminho = (partes.path or "/") + "?" + urlencode(existentes + list(consulta.items()))
        logger.info("lnurl fatura dominio=%s", host)
        try:
            resposta = await self.repository.buscar_json(host, caminho)
        except HostRecusadoError as exc:
            raise UpstreamError("Servico Lightning indisponivel") from exc
        except RespostaInvalidaError as exc:
            raise UpstreamError("Servico Lightning nao entregou a fatura") from exc

        pr = resposta.get("pr")
        if resposta.get("status") == "ERROR" or not isinstance(pr, str):
            motivo = resposta.get("reason")
            detalhes = {"motivo": motivo[:200]} if isinstance(motivo, str) else {}
            raise UpstreamError("Servico Lightning recusou o pedido", details=detalhes)
        if not pr.lower().startswith("ln") or len(pr) > 8192:
            raise UpstreamError("Servico Lightning devolveu uma fatura invalida")
        return LnurlFaturaRead(fatura=pr.strip())

    # -- internos -----------------------------------------------------------------------

    @staticmethod
    def _host_https(host: str | None, esquema: str, porta: int | None, usuario: str | None) -> str:
        # RN-LNURL-002: so HTTPS, sem porta diferente de 443 e sem usuario na URL.
        if esquema != "https" or not host or usuario or porta not in (None, 443):
            raise UpstreamError("Servico Lightning informou um endereco nao permitido")
        return host.lower()

    async def _consultar(self, endereco: str) -> _Servico:
        # RN-LNURL-001
        achado = ENDERECO.match(endereco.strip().lower())
        if achado is None:
            raise DomainValidationError("Endereco Lightning invalido")
        usuario, dominio = endereco.strip().lower().split("@")
        caminho = f"/.well-known/lnurlp/{usuario}"
        logger.info("lnurl consulta dominio=%s", dominio)
        try:
            dados = await self.repository.buscar_json(dominio, caminho)
        except HostRecusadoError as exc:
            # RN-LNURL-002: o dominio do endereco veio do cliente, entao e erro dele.
            raise DomainValidationError("Dominio do endereco Lightning nao permitido") from exc
        except RespostaInvalidaError as exc:
            raise UpstreamError("Servico Lightning nao respondeu") from exc
        return self._interpretar(dados, dominio, f"https://{dominio}{caminho}")

    @staticmethod
    def _interpretar(dados: dict[str, Any], dominio: str, url: str) -> _Servico:
        # RN-LNURL-005
        callback = dados.get("callback")
        minimo, maximo = dados.get("minSendable"), dados.get("maxSendable")
        if (
            dados.get("status") == "ERROR"
            or dados.get("tag") != "payRequest"
            or not isinstance(callback, str)
            or not callback.startswith("https://")
            or not isinstance(minimo, int | float)
            or not isinstance(maximo, int | float)
            or isinstance(minimo, bool)
            or isinstance(maximo, bool)
            or minimo <= 0
            or maximo < minimo
        ):
            raise UpstreamError("Servico Lightning respondeu num formato invalido")
        chave = dados.get("nostrPubkey")
        aceita_zap = (
            dados.get("allowsNostr") is True
            and isinstance(chave, str)
            and re.fullmatch(r"[0-9a-fA-F]{64}", chave) is not None
        )
        comentario = dados.get("commentAllowed")
        return _Servico(
            host=dominio,
            url=url,
            callback=callback,
            min_ms=int(minimo),
            max_ms=int(maximo),
            aceita_zap=aceita_zap,
            nostr_pubkey=chave.lower() if aceita_zap and isinstance(chave, str) else None,
            comentario_max=comentario if isinstance(comentario, int) and comentario > 0 else 0,
        )

    @staticmethod
    def _validar_pedido_de_zap(texto: str, servico: _Servico) -> None:
        # RN-LNURL-007
        if not servico.aceita_zap:
            raise DomainValidationError("Este servico Lightning nao aceita zap")
        try:
            evento = json.loads(texto)
        except ValueError as exc:
            raise DomainValidationError("Pedido de zap invalido") from exc
        if not isinstance(evento, dict) or evento.get("kind") != KIND_PEDIDO_DE_ZAP:
            raise DomainValidationError("Pedido de zap invalido")
