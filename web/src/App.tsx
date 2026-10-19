import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { caminhoBase } from '@/base'
import { iniciarMensageria } from '@/conversas/mensageria'
import { useConversas } from '@/conversas/useConversas'
import { useMensagens } from '@/conversas/useMensagens'
import { useSessao } from '@/nostr/useSessao'
import { EditarPerfil } from '@/pages/EditarPerfil'
import { Conversa } from '@/pages/Conversa'
import { LayoutConfiguracoes } from '@/pages/configuracoes/LayoutConfiguracoes'
import { SecaoConta } from '@/pages/configuracoes/SecaoConta'
import { SecaoSeguranca } from '@/pages/configuracoes/SecaoSeguranca'
import { SecaoSincronizacao } from '@/pages/configuracoes/SecaoSincronizacao'
import { SecaoSons } from '@/pages/configuracoes/SecaoSons'
import { LayoutConversas } from '@/pages/conversas/LayoutConversas'
import { PainelVazio } from '@/pages/conversas/PainelVazio'
import { Destravar } from '@/pages/Destravar'
import { Entrar } from '@/pages/entrar/Entrar'
import { Inicio } from '@/pages/Inicio'
import { MeuCodigo } from '@/pages/MeuCodigo'
import { Relays } from '@/pages/Relays'
import { NaoEncontrada } from '@/pages/NaoEncontrada'
import { useGrupos } from '@/grupos/useGrupos'
import { Grupo } from './pages/grupo/Grupo'
import { NovoGrupo } from './pages/grupo/NovoGrupo'
import { NovaConversa } from '@/pages/NovaConversa'

// /estilo so existe em desenvolvimento; no build de producao o ramo some.
const Estilo = import.meta.env.DEV
  ? lazy(() => import('@/pages/Estilo').then((m) => ({ default: m.Estilo })))
  : null

function SomenteDeslogado({ children }: { children: ReactNode }) {
  const fase = useSessao((s) => s.fase)
  return fase === 'dentro' ? <Navigate to="/conversas" replace /> : children
}

function SomenteLogado({ children }: { children: ReactNode }) {
  const fase = useSessao((s) => s.fase)
  return fase === 'dentro' ? children : <Navigate to="/entrar" replace />
}

export function App() {
  const fase = useSessao((s) => s.fase)
  const restaurar = useSessao((s) => s.restaurar)
  const assinante = useSessao((s) => s.assinante)

  useEffect(() => {
    void restaurar()
  }, [restaurar])

  // Dentro: recebe as mensagens enderecadas a mim; ao sair (ou trocar de conta) para de receber.
  useEffect(() => {
    if (!assinante) return
    return iniciarMensageria(assinante)
  }, [assinante])

  // RN-WEB-AUTH-008: depois de sair nada da conta anterior pode ficar na memoria da aba.
  useEffect(() => {
    if (fase !== 'fora') return
    useConversas.setState({ conversas: [], carregada: false })
    useMensagens.setState({ porConversa: {} })
    useGrupos.setState({ grupos: [], carregada: false })
  }, [fase])

  // Enquanto le o IndexedDB nao desenhamos nada: evita piscar a tela de entrar.
  if (fase === 'carregando') return null
  if (fase === 'precisa-senha') return <Destravar />

  return (
    <BrowserRouter basename={caminhoBase(import.meta.env.BASE_URL)}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route
            path="/entrar"
            element={
              <SomenteDeslogado>
                <Entrar />
              </SomenteDeslogado>
            }
          />
          {/* RN-WEB-LAYOUT-004: conversas, conta, perfil e codigo dividem a mesma lateral. */}
          <Route
            element={
              <SomenteLogado>
                <LayoutConversas />
              </SomenteLogado>
            }
          >
            <Route path="/conversas">
              <Route index element={<PainelVazio />} />
              <Route path="nova" element={<NovaConversa />} />
              <Route path="grupo/novo" element={<NovoGrupo />} />
              <Route path="grupo/:id" element={<Grupo />} />
              <Route path=":pubkey" element={<Conversa />} />
            </Route>
            <Route path="/meu-codigo" element={<MeuCodigo />} />
          </Route>
          {/* RN-WEB-LAYOUT-008: configuracoes ocupam a tela toda, sem a lista de conversas. */}
          <Route
            path="/configuracoes"
            element={
              <SomenteLogado>
                <LayoutConfiguracoes />
              </SomenteLogado>
            }
          >
            <Route index element={<SecaoConta />} />
            <Route path="conta" element={<SecaoConta />} />
            <Route path="perfil" element={<EditarPerfil secao="perfil" />} />
            <Route path="carteira" element={<EditarPerfil secao="carteira" />} />
            <Route path="relays" element={<Relays />} />
            <Route path="sons" element={<SecaoSons />} />
            <Route path="seguranca" element={<SecaoSeguranca />} />
            <Route path="sincronizacao" element={<SecaoSincronizacao />} />
          </Route>
          {/* Enderecos antigos continuam funcionando. */}
          <Route path="/conta" element={<Navigate to="/configuracoes/conta" replace />} />
          <Route path="/conta/perfil" element={<Navigate to="/configuracoes/perfil" replace />} />
          <Route path="/conta/relays" element={<Navigate to="/configuracoes/relays" replace />} />
          {Estilo && <Route path="/estilo" element={<Estilo />} />}
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
