import { useCallback, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import { Botao } from '@/components/ui/Botao'
import { Campo } from '@/components/ui/Campo'
import { Identidade } from '@/components/ui/Identidade'
import { LeitorQr } from '@/components/ui/LeitorQr'
import { useConversas } from '@/conversas/useConversas'
import { t } from '@/i18n/pt-BR'
import { lerChaveDoAmigo } from '@/nostr/contatos'
import { useSessao } from '@/nostr/useSessao'

interface Candidato {
  pubkey: string
  relays: string[]
}

export function NovaConversa() {
  const navigate = useNavigate()
  const minhaPubkey = useSessao((s) => s.assinante?.pubkey ?? '')
  const abrirOuCriar = useConversas((s) => s.abrirOuCriar)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string>()
  const [candidato, setCandidato] = useState<Candidato>()
  const [camera, setCamera] = useState(false)

  const avaliar = useCallback(
    (entrada: string) => {
      const r = lerChaveDoAmigo(entrada, minhaPubkey)
      if (r.ok) {
        setErro(undefined)
        setCandidato({ pubkey: r.pubkey, relays: r.relays })
        setCamera(false)
        return
      }
      // RN-WEB-CONVERSAS-003: uma nsec colada por engano e apagada do campo na hora.
      if (r.motivo === 'segredo') setTexto('')
      setErro(t.novaConversa.erros[r.motivo])
      setCamera(false)
    },
    [minhaPubkey],
  )

  const aoDigitar = (valor: string) => {
    // Pegar a nsec ainda na digitacao ou colagem: limpa assim que ela aparece.
    if (/^(nostr:)?nsec1/i.test(valor.trim())) return avaliar(valor)
    setTexto(valor)
    setErro(undefined)
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    avaliar(texto)
  }

  const confirmar = async () => {
    if (!candidato) return
    const { conversa } = await abrirOuCriar(candidato.pubkey, candidato.relays)
    navigate(`/conversas/${conversa.pubkey}`)
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <CabecalhoPagina titulo={t.novaConversa.titulo} voltarPara="/conversas" />

      {candidato ? (
        <section className="flex flex-col gap-4">
          <p className="font-bold">{t.novaConversa.pergunta}</p>
          <Identidade pubkey={candidato.pubkey} tamanho={56} />
          <div className="flex flex-wrap gap-3">
            <Botao onClick={confirmar}>{t.novaConversa.confirmar}</Botao>
            <Botao variante="secundario" onClick={() => setCandidato(undefined)}>
              {t.novaConversa.naoE}
            </Botao>
          </div>
        </section>
      ) : (
        <>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <Campo
              rotulo={t.novaConversa.campo}
              ajuda={t.novaConversa.ajuda}
              erro={erro}
              autoComplete="off"
              spellCheck={false}
              value={texto}
              onChange={(e) => aoDigitar(e.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <Botao type="submit" disabled={texto.trim() === ''}>
                {t.novaConversa.continuar}
              </Botao>
              <Botao variante="secundario" onClick={() => setCamera((aberta) => !aberta)}>
                {camera ? t.novaConversa.fecharCamera : t.novaConversa.lerQr}
              </Botao>
            </div>
          </form>
          {camera && <LeitorQr aoLer={avaliar} />}
        </>
      )}

      <div>
        <Botao variante="secundario" onClick={() => navigate('/conversas')}>
          {t.voltar}
        </Botao>
      </div>
    </main>
  )
}
