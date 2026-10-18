import { t } from '@/i18n/pt-BR'

// Coluna do meio quando nenhuma conversa esta aberta (so aparece em telas largas).
export function PainelVazio() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="border-2 border-borda bg-tinta px-4 py-1 font-display text-5xl text-fundo shadow-carimbo">
        {t.marca}
      </p>
      <h2 className="font-display text-2xl">{t.conversas.selecione}</h2>
      <p className="max-w-sm text-tinta-suave">{t.conversas.selecioneDica}</p>
    </div>
  )
}
