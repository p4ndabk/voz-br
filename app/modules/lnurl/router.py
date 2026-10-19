"""Rotas da ponte LNURL.

GET  /lnurl/consulta?endereco=  -> parametros do servico Lightning do endereco
POST /lnurl/fatura              -> pede a fatura ao servico e devolve so a fatura

Publicas de proposito: o login do Voz e Nostr, nao a conta da API (ver spec 0012).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.schemas import ErrorResponse
from app.modules.lnurl.controller import LnurlController
from app.modules.lnurl.repository import LnurlRepository
from app.modules.lnurl.schemas import (
    LnurlConsultaRead,
    LnurlFaturaCreate,
    LnurlFaturaRead,
)

router = APIRouter(prefix="/lnurl", tags=["lnurl"])


def get_lnurl_repository() -> LnurlRepository:
    return LnurlRepository()


RepositoryDep = Annotated[LnurlRepository, Depends(get_lnurl_repository)]

_erros = {
    400: {"model": ErrorResponse, "description": "Endereco, valor ou pedido de zap invalido"},
    502: {"model": ErrorResponse, "description": "Servico Lightning falhou ou respondeu errado"},
}


@router.get(
    "/consulta",
    response_model=LnurlConsultaRead,
    status_code=status.HTTP_200_OK,
    summary="Consulta o servico Lightning de um endereco",
    responses=_erros,
)
async def consultar(
    repository: RepositoryDep,
    endereco: Annotated[str, Query(max_length=200, examples=["pandabk@bipa.app"])],
) -> LnurlConsultaRead:
    return await LnurlController(repository).consultar(endereco)


@router.post(
    "/fatura",
    response_model=LnurlFaturaRead,
    status_code=status.HTTP_200_OK,
    summary="Pede uma fatura Lightning ao servico do endereco",
    responses=_erros,
)
async def fatura(dados: LnurlFaturaCreate, repository: RepositoryDep) -> LnurlFaturaRead:
    return await LnurlController(repository).fatura(dados)
