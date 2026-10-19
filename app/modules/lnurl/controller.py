"""Orquestracao do modulo lnurl."""

from app.modules.lnurl.repository import LnurlRepository
from app.modules.lnurl.schemas import (
    LnurlConsultaRead,
    LnurlFaturaCreate,
    LnurlFaturaRead,
)
from app.modules.lnurl.service import LnurlService


class LnurlController:
    def __init__(self, repository: LnurlRepository) -> None:
        self.service = LnurlService(repository)

    async def consultar(self, endereco: str) -> LnurlConsultaRead:
        return await self.service.consultar(endereco)

    async def fatura(self, dados: LnurlFaturaCreate) -> LnurlFaturaRead:
        return await self.service.fatura(dados)
