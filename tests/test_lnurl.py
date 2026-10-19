"""Testes do modulo lnurl (ponte para servicos Lightning).

O servidor Lightning e simulado por `httpx.MockTransport` e o DNS por um resolvedor falso:
nenhum teste sai para a rede.
"""

import json
import logging
from collections.abc import Callable, Iterator

import httpx
import pytest
from httpx import AsyncClient

from app.main import app
from app.modules.lnurl.repository import LnurlRepository
from app.modules.lnurl.router import get_lnurl_repository

IP_PUBLICO = "203.0.113.10"  # documentacao: tratado como nao-global? ver abaixo
IP_REAL = "8.8.8.8"
CHAVE_SERVICO = "f1d3a646ed504f87db4b15f593e123ef41977760174877e40eb4a0f5d470153f"


def servico(**extra: object) -> dict:
    base = {
        "tag": "payRequest",
        "callback": "https://bipa.app/lnurlpc/pandabk/123/abc",
        "metadata": '[["text/plain","pandabk"],["image/png;base64","' + "A" * 80_000 + '"]]',
        "minSendable": 1000,
        "maxSendable": 2_000_000_000,
        "commentAllowed": 140,
        "nostrPubkey": CHAVE_SERVICO,
        "allowsNostr": True,
    }
    base.update(extra)
    return base


class Servidor:
    """Registra as chamadas e responde conforme o caminho."""

    def __init__(self, responder: Callable[[httpx.Request], httpx.Response]) -> None:
        self.chamadas: list[httpx.Request] = []
        self._responder = responder
        self.transport = httpx.MockTransport(self._tratar)

    def _tratar(self, request: httpx.Request) -> httpx.Response:
        self.chamadas.append(request)
        return self._responder(request)


def json_ok(corpo: object) -> httpx.Response:
    return httpx.Response(200, json=corpo)


@pytest.fixture
def usar() -> Iterator[Callable[..., Servidor]]:
    def _usar(
        responder: Callable[[httpx.Request], httpx.Response],
        ips: dict[str, list[str]] | None = None,
    ) -> Servidor:
        servidor = Servidor(responder)
        tabela = ips or {}

        async def resolvedor(host: str) -> list[str]:
            return tabela.get(host, [IP_REAL])

        app.dependency_overrides[get_lnurl_repository] = lambda: LnurlRepository(
            transport=servidor.transport, resolvedor=resolvedor
        )
        return servidor

    yield _usar
    app.dependency_overrides.pop(get_lnurl_repository, None)


async def test_consulta_devolve_so_o_necessario(client: AsyncClient, usar) -> None:
    """RN-LNURL-005: nada de metadata nem imagens na resposta."""
    servidor = usar(lambda r: json_ok(servico()))

    r = await client.get("/lnurl/consulta", params={"endereco": "PandaBK@Bipa.app"})

    assert r.status_code == 200
    assert r.json() == {
        "url": "https://bipa.app/.well-known/lnurlp/pandabk",
        "min_sats": 1,
        "max_sats": 2_000_000,
        "aceita_zap": True,
        "nostr_pubkey": CHAVE_SERVICO,
        "comentario_max": 140,
    }
    # RN-LNURL-002: conecta no IP validado e leva o nome no Host e no SNI.
    chamada = servidor.chamadas[0]
    assert chamada.url.host == IP_REAL
    assert chamada.url.path == "/.well-known/lnurlp/pandabk"
    assert chamada.headers["host"] == "bipa.app"
    assert chamada.extensions["sni_hostname"] == "bipa.app"


@pytest.mark.parametrize(
    "endereco",
    [
        "sem-arroba",
        "a@localhost",
        "a@10.0.0.1",
        "a b@x.com",
        "@x.com",
        "a@x",
        "a@x..com",
        "a@x.com/y",
    ],
)
async def test_endereco_invalido_retorna_400(client: AsyncClient, usar, endereco: str) -> None:
    """RN-LNURL-001"""
    servidor = usar(lambda r: json_ok(servico()))

    r = await client.get("/lnurl/consulta", params={"endereco": endereco})

    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
    assert servidor.chamadas == []


@pytest.mark.parametrize("ip", ["10.0.0.1", "127.0.0.1", "169.254.169.254", "192.168.1.5", "::1"])
async def test_host_privado_e_recusado(client: AsyncClient, usar, ip: str) -> None:
    """RN-LNURL-002: dominio que resolve para rede interna nao recebe conexao."""
    servidor = usar(lambda r: json_ok(servico()), ips={"interno.exemplo.com": [ip]})

    r = await client.get("/lnurl/consulta", params={"endereco": "a@interno.exemplo.com"})

    assert r.status_code == 400
    assert servidor.chamadas == []


async def test_um_ip_privado_entre_varios_recusa(client: AsyncClient, usar) -> None:
    servidor = usar(lambda r: json_ok(servico()), ips={"misto.exemplo.com": [IP_REAL, "10.0.0.1"]})

    r = await client.get("/lnurl/consulta", params={"endereco": "a@misto.exemplo.com"})

    assert r.status_code == 400
    assert servidor.chamadas == []


async def test_redirecionamento_retorna_502(client: AsyncClient, usar) -> None:
    """RN-LNURL-003"""
    servidor = usar(lambda r: httpx.Response(302, headers={"location": "https://interno/"}))

    r = await client.get("/lnurl/consulta", params={"endereco": "a@bipa.app"})

    assert r.status_code == 502
    assert r.json()["error"]["code"] == "UPSTREAM_ERROR"
    assert len(servidor.chamadas) == 1  # nao seguiu


async def test_resposta_grande_retorna_502(client: AsyncClient, usar) -> None:
    """RN-LNURL-003"""
    usar(lambda r: httpx.Response(200, content=b"{" + b" " * (1024 * 1024 + 10) + b"}"))

    r = await client.get("/lnurl/consulta", params={"endereco": "a@bipa.app"})

    assert r.status_code == 502


async def test_servidor_fora_do_ar_retorna_502(client: AsyncClient, usar) -> None:
    def cair(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("recusou")

    usar(cair)

    r = await client.get("/lnurl/consulta", params={"endereco": "a@bipa.app"})

    assert r.status_code == 502


@pytest.mark.parametrize(
    "corpo",
    [
        servico(tag="withdrawRequest"),
        servico(callback="http://bipa.app/cb"),
        servico(callback=None),
        servico(minSendable=0),
        servico(minSendable=5000, maxSendable=1000),
        {"status": "ERROR", "reason": "nao existe"},
        ["lista"],
    ],
)
async def test_resposta_invalida_retorna_502(client: AsyncClient, usar, corpo: object) -> None:
    """RN-LNURL-005"""
    usar(lambda r: json_ok(corpo))

    r = await client.get("/lnurl/consulta", params={"endereco": "a@bipa.app"})

    assert r.status_code == 502


async def test_servico_sem_zap_nao_expoe_chave(client: AsyncClient, usar) -> None:
    usar(lambda r: json_ok(servico(allowsNostr=False)))

    r = await client.get("/lnurl/consulta", params={"endereco": "a@bipa.app"})

    assert r.json()["aceita_zap"] is False
    assert r.json()["nostr_pubkey"] is None


def pedido_de_zap(kind: int = 9734) -> str:
    return json.dumps({"kind": kind, "id": "p" * 64, "content": ""})


async def test_fatura_usa_o_callback_do_servico(client: AsyncClient, usar) -> None:
    """RN-LNURL-004: o cliente so informa o endereco; a API usa o callback do servico."""

    def responder(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/.well-known"):
            return json_ok(servico(callback="https://pagar.bipa.app/lnurlpc/x?k=1"))
        return json_ok({"pr": "lnbc1u1pabc"})

    servidor = usar(responder, ips={"pagar.bipa.app": ["1.1.1.1"]})

    r = await client.post("/lnurl/fatura", json={"endereco": "a@bipa.app", "sats": 100})

    assert r.status_code == 200
    assert r.json() == {"fatura": "lnbc1u1pabc"}
    callback = servidor.chamadas[1]
    assert callback.url.host == "1.1.1.1"
    assert callback.headers["host"] == "pagar.bipa.app"
    assert callback.url.path == "/lnurlpc/x"
    assert dict(callback.url.params) == {"k": "1", "amount": "100000"}


async def test_fatura_com_pedido_de_zap_e_comentario(client: AsyncClient, usar) -> None:
    """RN-LNURL-007: encaminha o pedido assinado; comentario cortado no limite do servico."""

    def responder(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/.well-known"):
            return json_ok(servico(commentAllowed=3))
        return json_ok({"pr": "lnbc1u1pabc"})

    servidor = usar(responder)
    zap = pedido_de_zap()

    r = await client.post(
        "/lnurl/fatura",
        json={
            "endereco": "a@bipa.app",
            "sats": 100,
            "nostr": zap,
            "lnurl": "LNURL1DP68GURN",
            "comentario": "abcdef",
        },
    )

    assert r.status_code == 200
    params = dict(servidor.chamadas[1].url.params)
    assert params["nostr"] == zap
    assert params["lnurl"] == "LNURL1DP68GURN"
    assert params["comment"] == "abc"


async def test_codigo_lnurl_malformado_nao_e_repassado(client: AsyncClient, usar) -> None:
    def responder(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/.well-known"):
            return json_ok(servico())
        return json_ok({"pr": "lnbc1u1pabc"})

    servidor = usar(responder)

    await client.post(
        "/lnurl/fatura",
        json={
            "endereco": "a@bipa.app",
            "sats": 100,
            "nostr": pedido_de_zap(),
            "lnurl": "http://interno/x",
        },
    )

    assert "lnurl" not in dict(servidor.chamadas[1].url.params)


@pytest.mark.parametrize("sats", [5, 3_000_000])
async def test_valor_fora_do_limite_retorna_400(client: AsyncClient, usar, sats: int) -> None:
    """RN-LNURL-006"""
    servidor = usar(lambda r: json_ok(servico(minSendable=10_000, maxSendable=1_000_000)))

    r = await client.post("/lnurl/fatura", json={"endereco": "a@bipa.app", "sats": sats})

    assert r.status_code == 400
    assert len(servidor.chamadas) == 1  # so a consulta; nenhuma fatura pedida


async def test_valor_zero_ou_negativo_retorna_422(client: AsyncClient, usar) -> None:
    usar(lambda r: json_ok(servico()))

    for sats in (0, -1):
        r = await client.post("/lnurl/fatura", json={"endereco": "a@bipa.app", "sats": sats})
        assert r.status_code == 422


async def test_zap_em_servico_sem_zap_retorna_400(client: AsyncClient, usar) -> None:
    """RN-LNURL-007"""
    usar(lambda r: json_ok(servico(allowsNostr=False)))

    r = await client.post(
        "/lnurl/fatura", json={"endereco": "a@bipa.app", "sats": 100, "nostr": pedido_de_zap()}
    )

    assert r.status_code == 400


@pytest.mark.parametrize("nostr", ["nao e json", pedido_de_zap(kind=1), "[1,2]"])
async def test_pedido_de_zap_invalido_retorna_400(client: AsyncClient, usar, nostr: str) -> None:
    """RN-LNURL-007"""
    usar(lambda r: json_ok(servico()))

    r = await client.post(
        "/lnurl/fatura", json={"endereco": "a@bipa.app", "sats": 100, "nostr": nostr}
    )

    assert r.status_code == 400


async def test_pedido_de_zap_grande_demais_retorna_422(client: AsyncClient, usar) -> None:
    usar(lambda r: json_ok(servico()))

    r = await client.post(
        "/lnurl/fatura",
        json={"endereco": "a@bipa.app", "sats": 100, "nostr": "x" * 20_000},
    )

    assert r.status_code == 422


@pytest.mark.parametrize(
    "callback",
    ["https://interno:8443/cb", "https://user:senha@bipa.app/cb", "https://10.0.0.1/cb"],
)
async def test_callback_perigoso_retorna_502(client: AsyncClient, usar, callback: str) -> None:
    """RN-LNURL-002: o callback tambem passa pela mesma defesa."""

    def responder(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/.well-known"):
            return json_ok(servico(callback=callback))
        return json_ok({"pr": "lnbc1u1pabc"})

    servidor = usar(responder, ips={"10.0.0.1": ["10.0.0.1"]})

    r = await client.post("/lnurl/fatura", json={"endereco": "a@bipa.app", "sats": 100})

    assert r.status_code == 502
    assert len(servidor.chamadas) == 1  # so a consulta; o callback nao recebeu conexao


async def test_servico_que_recusa_o_pedido_retorna_502(client: AsyncClient, usar) -> None:
    def responder(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/.well-known"):
            return json_ok(servico())
        return json_ok({"status": "ERROR", "reason": "sem liquidez"})

    usar(responder)

    r = await client.post("/lnurl/fatura", json={"endereco": "a@bipa.app", "sats": 100})

    assert r.status_code == 502
    assert r.json()["error"]["details"] == {"motivo": "sem liquidez"}


@pytest.mark.parametrize("pr", ["abc", 123, None])
async def test_fatura_invalida_retorna_502(client: AsyncClient, usar, pr: object) -> None:
    def responder(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/.well-known"):
            return json_ok(servico())
        return json_ok({"pr": pr})

    usar(responder)

    r = await client.post("/lnurl/fatura", json={"endereco": "a@bipa.app", "sats": 100})

    assert r.status_code == 502


async def test_log_nao_tem_o_usuario(client: AsyncClient, usar, caplog) -> None:
    """RN-LNURL-008: o log registra so o dominio."""

    def responder(request: httpx.Request) -> httpx.Response:
        if request.url.path.startswith("/.well-known"):
            return json_ok(servico())
        return json_ok({"pr": "lnbc1u1pabc"})

    usar(responder)
    with caplog.at_level(logging.DEBUG):
        await client.post(
            "/lnurl/fatura", json={"endereco": "segredo.pessoa@bipa.app", "sats": 100}
        )

    texto = caplog.text
    assert "bipa.app" in texto
    assert "segredo" not in texto
    assert "lnbc1u1pabc" not in texto
