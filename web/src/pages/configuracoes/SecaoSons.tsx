import { useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Botao } from '@/components/ui/Botao'
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina'
import {
  desligarNotificacoes,
  estadoNotificacoes,
  ligarNotificacoes,
  type EstadoNotificacoes,
} from '@/conversas/notificacoes'
import { definirSom, somLigado, tocarFogo, tocarPlin } from '@/conversas/som'
import { t } from '@/i18n/pt-BR'

// Configuracoes > Sons e avisos: o som do "plin" e do fogo, e os avisos do navegador.
export function SecaoSons() {
  const [som, setSom] = useState(somLigado)
  const [avisos, setAvisos] = useState<EstadoNotificacoes>(estadoNotificacoes)

  return (
    <main className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-y-auto px-4 py-8">
      <CabecalhoPagina titulo={t.configuracoes.sons} voltarPara="/configuracoes" soNoCelular />

      <section className="flex flex-col gap-2" aria-labelledby="som-mensagem">
        <h2 id="som-mensagem" className="font-bold">
          {t.notificacoes.som}
        </h2>
        <p className="text-sm text-tinta-suave">{t.notificacoes.somAjuda}</p>
        <p role="status">{som ? t.notificacoes.somLigado : t.notificacoes.somSilenciado}</p>
        <div>
          <Botao
            variante="secundario"
            onClick={() => {
              definirSom(!som)
              setSom(!som)
            }}
          >
            {som ? t.notificacoes.somSilenciar : t.notificacoes.somLigar}
          </Botao>
          <Botao variante="secundario" className="ml-3" onClick={() => tocarPlin(true)}>
            {t.notificacoes.somOuvir}
          </Botao>
          <Botao variante="secundario" className="ml-3" onClick={() => tocarFogo(2400, true)}>
            {t.notificacoes.somOuvirFogo}
          </Botao>
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="avisos-navegador">
        <h2 id="avisos-navegador" className="font-bold">
          {t.notificacoes.secao}
        </h2>
        <p className="text-sm text-tinta-suave">{t.notificacoes.ajuda}</p>
        {avisos === 'ligada' && <p role="status">{t.notificacoes.ligados}</p>}
        {avisos === 'bloqueada' && <Aviso tom="erro">{t.notificacoes.bloqueada}</Aviso>}
        {avisos === 'indisponivel' && <p>{t.notificacoes.indisponivel}</p>}
        {(avisos === 'desligada' || avisos === 'ligada') && (
          <div>
            <Botao
              variante="secundario"
              onClick={async () => {
                if (avisos === 'ligada') {
                  desligarNotificacoes()
                  setAvisos(estadoNotificacoes())
                } else {
                  setAvisos(await ligarNotificacoes())
                }
              }}
            >
              {avisos === 'ligada' ? t.notificacoes.desligar : t.notificacoes.ligar}
            </Botao>
          </div>
        )}
      </section>
    </main>
  )
}
