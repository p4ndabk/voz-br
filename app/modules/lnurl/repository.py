"""Acesso ao servidor Lightning de terceiros (o recurso externo deste modulo).

Este modulo nao tem tabela: como no `health`, o repository e o UNICO ponto que fala com o
recurso de fora (la o banco, aqui o servidor LNURL). Toda a defesa contra SSRF mora aqui.

RN-LNURL-002: so HTTPS, so hosts publicos, conexao no IP ja validado.
RN-LNURL-003: sem redirecionamento, 8 s, 1 MiB.
"""

import asyncio
import ipaddress
import json
import logging
import socket
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

TEMPO_MAXIMO_S = 8.0
TAMANHO_MAXIMO = 1024 * 1024

# RN-LNURL-008: o httpx registra a URL inteira de cada chamada (usuario do endereco, valor e o
# pedido de zap assinado). Aqui so interessa erro.
for _nome in ("httpx", "httpcore"):
    logging.getLogger(_nome).setLevel(logging.WARNING)

Resolvedor = Callable[[str], Awaitable[list[str]]]


class HostRecusadoError(Exception):
    """O host nao e publico (ou nao resolve): nao abrimos conexao."""


class RespostaInvalidaError(Exception):
    """O servidor demorou, redirecionou, respondeu com erro, grande demais ou sem JSON."""


async def resolver_dns(host: str) -> list[str]:
    infos = await asyncio.get_running_loop().getaddrinfo(
        host, 443, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP
    )
    return sorted({str(info[4][0]) for info in infos})


class LnurlRepository:
    def __init__(
        self,
        transport: httpx.AsyncBaseTransport | None = None,
        resolvedor: Resolvedor = resolver_dns,
    ) -> None:
        self.transport = transport
        self.resolvedor = resolvedor

    async def _ip_publico(self, host: str) -> str:
        try:
            ips = await self.resolvedor(host)
        except OSError as exc:
            raise HostRecusadoError(host) from exc
        if not ips:
            raise HostRecusadoError(host)
        for ip in ips:
            # is_global recusa loopback, privada, link-local, reservada, multicast e afins.
            if not ipaddress.ip_address(ip).is_global:
                raise HostRecusadoError(host)
        return ips[0]

    async def buscar_json(self, host: str, caminho: str) -> dict[str, Any]:
        """GET https://host/caminho, sempre na porta 443, e devolve o JSON (objeto)."""
        ip = await self._ip_publico(host)
        endereco = f"[{ip}]" if ":" in ip else ip
        try:
            async with asyncio.timeout(TEMPO_MAXIMO_S):
                async with httpx.AsyncClient(
                    transport=self.transport,
                    follow_redirects=False,
                    trust_env=False,
                    timeout=TEMPO_MAXIMO_S,
                ) as cliente:
                    # Conecta no IP validado; o nome vai no Host e no SNI (valida o certificado).
                    async with cliente.stream(
                        "GET",
                        f"https://{endereco}{caminho}",
                        headers={"Host": host, "Accept": "application/json"},
                        extensions={"sni_hostname": host},
                    ) as resposta:
                        if resposta.status_code != 200:
                            raise RespostaInvalidaError(f"status {resposta.status_code}")
                        corpo = bytearray()
                        async for pedaco in resposta.aiter_bytes():
                            corpo += pedaco
                            if len(corpo) > TAMANHO_MAXIMO:
                                raise RespostaInvalidaError("resposta grande demais")
        except (httpx.HTTPError, TimeoutError) as exc:
            raise RespostaInvalidaError(type(exc).__name__) from exc
        try:
            dados = json.loads(bytes(corpo))
        except ValueError as exc:
            raise RespostaInvalidaError("nao e JSON") from exc
        if not isinstance(dados, dict):
            raise RespostaInvalidaError("nao e um objeto JSON")
        return dados
