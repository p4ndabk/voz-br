import { useState, type FormEvent } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Campo } from '@/components/ui/Campo'
import { useMeusRelays, validarRelay } from '@/conversas/meusRelays'
import { t } from '@/i18n/pt-BR'
import { relaysPadrao } from '@/nostr/config'
import { medirRelay } from '@/nostr/relays'
import { useRelays } from '@/nostr/useRelays'
import { useSessao } from '@/nostr/useSessao'

const iguais = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((u, i) => u === b[i])

type Resultado = { tipo: 'ok'; aceitos: number; total: number } | { tipo: 'erro' }

// RN-WEB-RELAYS-007 a 010: a pessoa ve, adiciona e remove os relays da sua lista de DM (kind 10050).
export function Relays() {
  const assinante = useSessao((s) => s.assinante)
  const salva = useMeusRelays((s) => s.lista)
  const salvar = useMeusRelays((s) => s.salvar)
  const { lista: estados } = useRelays()

  const efetiva = salva.length > 0 ? salva : [...relaysPadrao]
  // null = sem edicao em andamento: a tela mostra a lista em vigor.
  const [rascunho, setRascunho] = useState<string[] | null>(null)
  const mostrada = rascunho ?? efetiva
  const mudou = rascunho !== null && !iguais(rascunho, efetiva)

  const [entrada, setEntrada] = useState('')
  const [erroCampo, setErroCampo] = useState<string>()
  const [testando, setTestando] = useState(false)
  const [semConexao, setSemConexao] = useState<string>()
  const [salvando, setSalvando] = useState(false)
  // Ultima medida de cada relay: ms, ou null se nao conectou. Ausente = ainda nao medido.
  const [medidas, setMedidas] = useState<Record<string, number | null>>({})
  const [medindo, setMedindo] = useState(false)
  const [resultado, setResultado] = useState<Resultado>()

  if (!assinante) return null

  const editar = (nova: string[]) => {
    setRascunho(nova)
    setResultado(undefined)
  }

  const incluir = (url: string) => {
    editar([...mostrada, url])
    setEntrada('')
    setSemConexao(undefined)
  }

  const adicionar = async (e: FormEvent) => {
    e.preventDefault()
    setErroCampo(undefined)
    setSemConexao(undefined)
    const r = validarRelay(entrada, mostrada)
    if (!r.ok) return setErroCampo(t.relaysConfig.erros[r.motivo])
    setTestando(true)
    const ms = await medirRelay(r.url)
    setTestando(false)
    setMedidas((m) => ({ ...m, [r.url]: ms }))
    if (ms !== null) incluir(r.url)
    else setSemConexao(r.url)
  }

  const gravar = async () => {
    setSalvando(true)
    setResultado(undefined)
    try {
      const { aceitos, total } = await salvar(assinante, mostrada)
      setRascunho(null)
      setResultado({ tipo: 'ok', aceitos, total })
    } catch {
      setResultado({ tipo: 'erro' })
    } finally {
      setSalvando(false)
    }
  }

  // RN-WEB-RELAYS-011: mede todos da lista de uma vez para a pessoa comparar.
  const medirTodos = async () => {
    setMedindo(true)
    const resultados = await Promise.all(
      mostrada.map(async (url) => [url, await medirRelay(url)] as const),
    )
    setMedidas((m) => ({ ...m, ...Object.fromEntries(resultados) }))
    setMedindo(false)
  }

  const latenciaDe = (url: string) => {
    if (!(url in medidas)) return null
    const ms = medidas[url]
    return ms === null ? t.relaysConfig.semResposta : t.relaysConfig.latencia(ms ?? 0)
  }

  const estadoDe = (url: string) => {
    if (rascunho && !efetiva.includes(url)) return t.relaysConfig.estado.novo
    const e = estados.find((r) => r.url === url)?.estado
    return t.relaysConfig.estado[e ?? 'conectando']
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <CabecalhoPagina titulo={t.relaysConfig.titulo} voltarPara="/configuracoes" soNoCelular />
      <p className="text-tinta-suave">{t.relaysConfig.intro}</p>
      <Aviso>{t.relaysConfig.privacidade}</Aviso>

      <section aria-labelledby="lista-relays" className="flex flex-col gap-3">
        <h2 id="lista-relays" className="font-bold">
          {t.relaysConfig.lista}
        </h2>
        <ul className="flex flex-col gap-2">
          {mostrada.map((url) => (
            <li
              key={url}
              className="flex flex-wrap items-center gap-3 rounded-cordel border-2 border-borda bg-superficie px-3 py-2"
            >
              <span className="min-w-0 flex-1 break-all font-mono text-sm">{url}</span>
              <span className="text-sm text-tinta-suave">
                {estadoDe(url)}
                {latenciaDe(url) && ` · ${latenciaDe(url)}`}
              </span>
              <Botao
                variante="secundario"
                className="px-3 py-1 text-sm"
                aria-label={t.relaysConfig.remover(url)}
                disabled={mostrada.length <= 1}
                onClick={() => editar(mostrada.filter((u) => u !== url))}
              >
                {t.relaysConfig.removerBotao}
              </Botao>
            </li>
          ))}
        </ul>
        <div>
          <Botao variante="secundario" onClick={() => void medirTodos()} disabled={medindo}>
            {medindo ? t.relaysConfig.medindo : t.relaysConfig.medir}
          </Botao>
        </div>
        {mostrada.length <= 1 && (
          <p className="text-sm text-tinta-suave">{t.relaysConfig.ultimo}</p>
        )}
      </section>

      <form onSubmit={adicionar} className="flex flex-col gap-3">
        <h2 className="font-bold">{t.relaysConfig.adicionar}</h2>
        <Campo
          rotulo={t.relaysConfig.campo}
          ajuda={t.relaysConfig.ajuda}
          erro={erroCampo}
          placeholder={t.relaysConfig.exemplo}
          value={entrada}
          onChange={(e) => {
            setEntrada(e.target.value)
            setErroCampo(undefined)
            setSemConexao(undefined)
          }}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="url"
        />
        <div>
          <Botao type="submit" variante="secundario" disabled={testando || entrada.trim() === ''}>
            {t.relaysConfig.adicionarBotao}
          </Botao>
        </div>
        {testando && <p role="status">{t.relaysConfig.testando}</p>}
        {semConexao && (
          <div className="flex flex-col items-start gap-3">
            <Aviso tom="erro">{t.relaysConfig.naoConectou(semConexao)}</Aviso>
            <div className="flex flex-wrap gap-2">
              <Botao variante="secundario" onClick={() => incluir(semConexao)}>
                {t.relaysConfig.adicionarMesmoAssim}
              </Botao>
              <Botao variante="secundario" onClick={() => setSemConexao(undefined)}>
                {t.relaysConfig.cancelar}
              </Botao>
            </div>
          </div>
        )}
      </form>

      <div className="flex flex-col gap-3">
        {mudou && <p className="text-sm text-tinta-suave">{t.relaysConfig.naoSalvo}</p>}
        <div className="flex flex-wrap gap-3">
          <Botao onClick={() => void gravar()} disabled={!mudou || salvando}>
            {salvando ? t.relaysConfig.salvando : t.relaysConfig.salvar}
          </Botao>
          <Botao
            variante="secundario"
            onClick={() => editar([...relaysPadrao])}
            disabled={iguais(mostrada, relaysPadrao) || salvando}
          >
            {t.relaysConfig.restaurar}
          </Botao>
        </div>
        {resultado?.tipo === 'ok' && (
          <Aviso>{t.relaysConfig.salvo(resultado.aceitos, resultado.total)}</Aviso>
        )}
        {resultado?.tipo === 'erro' && <Aviso tom="erro">{t.relaysConfig.falhou}</Aviso>}
      </div>
    </main>
  )
}
