"""Contratos de entrada/saida do modulo lnurl (ponte para servicos Lightning)."""

from pydantic import BaseModel, Field


class LnurlConsultaRead(BaseModel):
    """O que o cliente precisa saber do servico: nunca a metadata nem imagens (RN-LNURL-005)."""

    url: str = Field(..., examples=["https://bipa.app/.well-known/lnurlp/pandabk"])
    min_sats: int = Field(..., examples=[1])
    max_sats: int = Field(..., examples=[2000000])
    aceita_zap: bool
    nostr_pubkey: str | None = None
    comentario_max: int = Field(..., ge=0)


class LnurlFaturaCreate(BaseModel):
    endereco: str = Field(..., max_length=200, examples=["pandabk@bipa.app"])
    sats: int = Field(..., ge=1, examples=[100])
    # Pedido de zap (kind 9734) ja assinado pelo cliente, como JSON (RN-LNURL-007).
    nostr: str | None = Field(default=None, max_length=16_384)
    # Codigo lnurl (bech32) que acompanha o pedido de zap.
    lnurl: str | None = Field(default=None, max_length=2_000)
    comentario: str | None = Field(default=None, max_length=500)


class LnurlFaturaRead(BaseModel):
    fatura: str
