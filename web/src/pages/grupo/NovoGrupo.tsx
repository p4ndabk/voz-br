import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Campo } from '@/components/ui/Campo'
import { criarNovoGrupo } from '@/grupos/acoes'
import { MAXIMO_MEMBROS, TAMANHO_MAXIMO_NOME_GRUPO } from '@/grupos/tipos'
import { useConversas } from '@/conversas/useConversas'
import { t } from '@/i18n/pt-BR'
import { lerChaveDoAmigo } from '@/nostr/contatos'
import { nomeExibido } from '@/nostr/perfis'
import { usePerfis } from '@/nostr/perfisStore'
import { useSessao } from '@/nostr/useSessao'
import { PessoaDoGrupo } from './PessoaDoGrupo'

// RN-WEB-GRUPOS-002: quem cria e o admin; os convidados so entram se aceitarem.
export function NovoGrupo() {
  const navigate = useNavigate()
  const assinante = useSessao((s) => s.assinante)
  const conversas = useConversas((s) => s.conversas)
  const perfis = usePerfis((s) => s.perfis)
  const [nome, setNome] = useState('')
  const [escolhidos, setEscolhidos] = useState<string[]>([])
  const [chave, setChave] = useState('')
  const [erroChave, setErroChave] = useState<string>()
  const [erro, setErro] = useState<string>()
  const [criando, setCriando] = useState(false)

  if (!assinante) return null
  const eu = assinante.pubkey
  const contatos = conversas.filter((c) => c.pubkey !== eu)
  const alternar = (pk: string) =>
    setEscolhidos((atual) => (atual.includes(pk) ? atual.filter((x) => x !== pk) : [...atual, pk]))

  const adicionarChave = (e: FormEvent) => {
    e.preventDefault()
    const r = lerChaveDoAmigo(chave, eu)
    if (!r.ok) {
      if (r.motivo === 'segredo') setChave('')
      return setErroChave(t.novaConversa.erros[r.motivo])
    }
    setErroChave(undefined)
    setChave('')
    setEscolhidos((atual) => (atual.includes(r.pubkey) ? atual : [...atual, r.pubkey]))
  }

  const criar = async () => {
    setCriando(true)
    setErro(undefined)
    const meuNome = nomeExibido(perfis[eu], eu).texto
    const r = await criarNovoGrupo(assinante, nome, escolhidos, meuNome)
    setCriando(false)
    if (!r.ok) return setErro(t.grupos.erros[r.erro])
    navigate(`/conversas/grupo/${r.grupo.id}`)
  }

  const extras = escolhidos.filter((pk) => !contatos.some((c) => c.pubkey === pk))
  const limiteAtingido = escolhidos.length >= MAXIMO_MEMBROS - 1

  return (
    <main className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <CabecalhoPagina titulo={t.grupos.titulo} voltarPara="/conversas" />

      <Campo
        rotulo={t.grupos.nomeCampo}
        ajuda={t.grupos.nomeAjuda}
        maxLength={TAMANHO_MAXIMO_NOME_GRUPO}
        autoComplete="off"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{t.grupos.convidarTitulo}</h2>
        <p className="text-sm text-tinta-suave">{t.grupos.convidarAjuda}</p>
        {contatos.length === 0 && extras.length === 0 ? (
          <p className="text-tinta-suave">{t.grupos.semContatos}</p>
        ) : (
          <ul aria-label={t.grupos.contatos} className="flex flex-col gap-1">
            {[...contatos.map((c) => c.pubkey), ...extras].map((pk) => {
              const marcado = escolhidos.includes(pk)
              return (
                <li key={pk}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-cordel border-2 border-borda bg-superficie px-3 py-2">
                    <input
                      type="checkbox"
                      checked={marcado}
                      disabled={!marcado && limiteAtingido}
                      onChange={() => alternar(pk)}
                      className="h-5 w-5 accent-vermelho"
                    />
                    <PessoaDoGrupo pubkey={pk} tamanho={36} />
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        <form onSubmit={adicionarChave} className="flex flex-col gap-2">
          <Campo
            rotulo={t.grupos.chaveCampo}
            ajuda={t.grupos.chaveAjuda}
            erro={erroChave}
            autoComplete="off"
            spellCheck={false}
            value={chave}
            onChange={(e) => {
              setChave(e.target.value)
              setErroChave(undefined)
            }}
          />
          <div>
            <Botao type="submit" variante="secundario" disabled={chave.trim() === ''}>
              {t.grupos.adicionarChave}
            </Botao>
          </div>
        </form>
        <p className="text-sm text-tinta-suave">{t.grupos.escolhidas(escolhidos.length)}</p>
      </section>

      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <div>
        <Botao
          onClick={() => void criar()}
          disabled={criando || nome.trim() === '' || escolhidos.length === 0}
        >
          {criando ? t.grupos.criando : t.grupos.criar}
        </Botao>
      </div>
    </main>
  )
}
