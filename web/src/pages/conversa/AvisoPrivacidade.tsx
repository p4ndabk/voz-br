import { get, set } from 'idb-keyval'
import { useEffect, useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { t } from '@/i18n/pt-BR'

// Aparece uma vez por conversa: diz o que os relays veem e o que nao veem.
export function AvisoPrivacidade({ pubkey, nome }: { pubkey: string; nome: string }) {
  const chave = `voz:aviso-visto:${pubkey}`
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    let ativo = true
    void get(chave)
      .then((visto) => ativo && setVisivel(!visto))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [chave])

  if (!visivel) return null
  const entendi = () => {
    setVisivel(false)
    void set(chave, true).catch(() => {})
  }

  return (
    <Aviso>
      <div className="flex flex-col items-start gap-3">
        <p>{t.mensagens.avisoPrivacidade(nome)}</p>
        <Botao variante="secundario" onClick={entendi}>
          {t.mensagens.entendi}
        </Botao>
      </div>
    </Aviso>
  )
}
