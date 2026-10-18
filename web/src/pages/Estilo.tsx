import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Aviso } from '@/components/ui/Aviso'
import { Balao } from '@/components/ui/Balao'
import { Botao } from '@/components/ui/Botao'
import { Campo } from '@/components/ui/Campo'
import { Modal } from '@/components/ui/Modal'
import { Selo } from '@/components/ui/Selo'
import { t } from '@/i18n/pt-BR'

type Tema = 'sistema' | 'claro' | 'escuro'

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t-2 border-borda pt-4">
      <h2 className="font-display text-2xl">{titulo}</h2>
      {children}
    </section>
  )
}

// Pagina so de desenvolvimento: mostra todos os componentes nos dois temas.
export function Estilo() {
  const [tema, setTema] = useState<Tema>('sistema')
  const [modal, setModal] = useState(false)

  const escolher = (novo: Tema) => {
    setTema(novo)
    if (novo === 'sistema') document.documentElement.removeAttribute('data-tema')
    else document.documentElement.setAttribute('data-tema', novo)
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-4xl">{t.estilo.titulo}</h1>
      <div className="flex flex-wrap gap-2">
        {(['sistema', 'claro', 'escuro'] as const).map((opcao) => (
          <Botao
            key={opcao}
            variante={tema === opcao ? 'principal' : 'secundario'}
            onClick={() => escolher(opcao)}
          >
            {t.estilo.tema[opcao]}
          </Botao>
        ))}
      </div>

      <Secao titulo={t.estilo.botoes}>
        <div className="flex flex-wrap gap-3">
          <Botao>{t.estilo.exemploPrincipal}</Botao>
          <Botao variante="secundario">{t.estilo.exemploSecundario}</Botao>
          <Botao disabled>{t.estilo.exemploDesabilitado}</Botao>
        </div>
      </Secao>

      <Secao titulo={t.estilo.campos}>
        <Campo rotulo={t.estilo.exemploCampo} ajuda={t.estilo.exemploAjuda} />
        <Campo rotulo={t.estilo.exemploCampo} erro={t.estilo.exemploErro} defaultValue="npub1xyz" />
      </Secao>

      <Secao titulo={t.estilo.baloes}>
        <Balao autor="outro" hora="10:41">
          {t.estilo.exemploOutro}
        </Balao>
        <Balao autor="meu" hora="10:42">
          {t.estilo.exemploMeu}
        </Balao>
      </Secao>

      <Secao titulo={t.estilo.selos}>
        <div className="flex gap-3">
          <Selo tipo="privado" />
          <Selo tipo="publico" />
        </div>
      </Secao>

      <Secao titulo={t.estilo.avisos}>
        <Aviso>{t.estilo.exemploAviso}</Aviso>
        <Aviso tom="erro">{t.estilo.exemploAvisoErro}</Aviso>
      </Secao>

      <Secao titulo={t.estilo.avatar}>
        <div className="flex gap-3">
          {['maria', 'joao', 'plataro', 'hannah'].map((semente) => (
            <Avatar key={semente} semente={semente} tamanho={48} />
          ))}
        </div>
      </Secao>

      <Secao titulo={t.estilo.modal}>
        <div>
          <Botao variante="secundario" onClick={() => setModal(true)}>
            {t.estilo.abrirModal}
          </Botao>
        </div>
        <Modal aberto={modal} titulo={t.estilo.exemploModalTitulo} aoFechar={() => setModal(false)}>
          {t.estilo.exemploModalTexto}
        </Modal>
      </Secao>
    </main>
  )
}
