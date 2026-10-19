import { Fragment } from 'react'
import { Balao } from '@/components/ui/Balao'
import { Botao } from '@/components/ui/Botao'
import { TextoComLinks } from '@/components/ui/TextoComLinks'
import type { Mensagem } from '@/conversas/armazemMensagens'
import { chaveDoDia, horaDe, rotuloDoDia } from '@/conversas/dias'
import { t } from '@/i18n/pt-BR'

interface Props {
  mensagens: Mensagem[]
  minhaPubkey: string
  aoTentarDeNovo: (id: string) => void
  // Mensagens que estao queimando agora (RN-WEB-APAGAR-010) e como: fogo ou so esmaecer (RN-WEB-APAGAR-011).
  queimando?: ReadonlySet<string>
  modoDaQueima?: 'fogo' | 'suave'
  // Em grupo, o nome de quem escreveu aparece em cima do balao dos outros.
  nomeDe?: (pubkey: string) => string
}

export function ListaMensagens({
  mensagens,
  minhaPubkey,
  aoTentarDeNovo,
  queimando,
  modoDaQueima = 'fogo',
  nomeDe,
}: Props) {
  return (
    <ol aria-label={t.mensagens.lista} className="flex flex-col gap-3">
      {mensagens.map((m, i) => {
        const meu = m.autor === minhaPubkey
        const novoDia = i === 0 || chaveDoDia(mensagens[i - 1]!.criadoEm) !== chaveDoDia(m.criadoEm)
        return (
          <Fragment key={m.id}>
            {novoDia && (
              <li className="self-center rounded-cordel border-2 border-borda bg-superficie px-3 py-0.5 text-xs font-bold uppercase tracking-wide">
                {rotuloDoDia(m.criadoEm)}
              </li>
            )}
            <li
              data-mensagem={m.id}
              className={`flex flex-col gap-1 ${
                queimando?.has(m.id) ? (modoDaQueima === 'fogo' ? 'queimar' : 'queimar-suave') : ''
              }`}
            >
              {!meu && nomeDe && (
                <p className="ml-1 text-xs font-bold text-tinta-suave">{nomeDe(m.autor)}</p>
              )}
              <Balao autor={meu ? 'meu' : 'outro'} hora={horaDe(m.criadoEm)}>
                <TextoComLinks texto={m.texto} />
              </Balao>
              {meu && m.estado === 'enviando' && (
                <p className="self-end text-xs text-tinta-suave">{t.mensagens.enviando}</p>
              )}
              {meu && m.estado === 'falhou' && (
                <div className="flex items-center justify-end gap-3">
                  <p role="alert" className="text-sm font-bold text-vermelho">
                    {t.mensagens.falhou}
                  </p>
                  <Botao variante="secundario" onClick={() => aoTentarDeNovo(m.id)}>
                    {t.mensagens.tentarDeNovo}
                  </Botao>
                </div>
              )}
              {meu && m.estado === 'enviada' && m.semRelaysDm && (
                <p className="self-end text-xs text-tinta-suave">{t.mensagens.semRelaysDm}</p>
              )}
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
