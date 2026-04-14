'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/600.css'

function HistoricoContent() {
  const [vendas, setVendas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [vendasFiltradas, setVendasFiltradas] = useState([])

  const [hover, setHover] = useState(null)
  const [mobile, setMobile] = useState(false)

  const [busca, setBusca] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const params = useSearchParams()
  const tipo = params.get('tipo')
  const produtoURL = params.get('produto')

  useEffect(() => {
    buscar()

    function check() {
      setMobile(window.innerWidth < 768)
    }

    check()
    window.addEventListener('resize', check)

    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    aplicarFiltro()
  }, [vendas, busca, dataInicio, dataFim, tipo, produtoURL])

  async function buscar() {
    const { data: v } = await supabase
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: p } = await supabase
      .from('produtos')
      .select('*')

    setVendas(v || [])
    setProdutos(p || [])
  }

  function aplicarFiltro() {
    let filtradas = [...(vendas || [])]
    const hoje = new Date()

    if (tipo === 'hoje') {
      filtradas = filtradas.filter(v => {
        if (!v?.created_at) return false
        const d = new Date(v.created_at)
        return d.toDateString() === hoje.toDateString()
      })
    }

    if (tipo === 'mes') {
      filtradas = filtradas.filter(v => {
        if (!v?.created_at) return false
        const d = new Date(v.created_at)
        return d.getMonth() === hoje.getMonth()
      })
    }

    if (produtoURL) {
      filtradas = filtradas.filter(v => v?.produto_id == produtoURL)
    }

    if (busca) {
      filtradas = filtradas.filter(v => {
        const produto = (produtos || []).find(p => p.id == v?.produto_id)
        return produto?.nome?.toLowerCase().includes(busca.toLowerCase())
      })
    }

    if (dataInicio) {
      filtradas = filtradas.filter(v =>
        new Date(v?.created_at) >= new Date(dataInicio)
      )
    }

    if (dataFim) {
      filtradas = filtradas.filter(v =>
        new Date(v?.created_at) <= new Date(dataFim)
      )
    }

    setVendasFiltradas(filtradas)
  }

  async function cancelarVenda(id) {
    await supabase
      .from('vendas')
      .update({ status: 'cancelado' })
      .eq('id', id)

    buscar()
  }

  function limparFiltro() {
    window.location.href = '/historico'
  }

  const vendasSafe = vendasFiltradas || []

  const total = vendasSafe
    .filter(v => v?.status !== 'cancelado')
    .reduce((acc, v) => acc + Number(v?.valor_total || 0), 0)

  const lucro = vendasSafe
    .filter(v => v?.status !== 'cancelado')
    .reduce(
      (acc, v) =>
        acc + (Number(v?.valor_total || 0) - Number(v?.custo_total || 0)),
      0
    )

  const quantidade = vendasSafe.length
  const ticket = quantidade > 0 ? total / quantidade : 0
  const margem = total > 0 ? (lucro / total) * 100 : 0

  return (
    <div style={{
      ...styles.container,
      padding: mobile ? 15 : 20
    }}>
      <h1 style={styles.title}>Histórico de Vendas</h1>

      <div style={{
        ...styles.filtros,
        flexDirection: mobile ? 'column' : 'row'
      }}>
        <input
          placeholder="Buscar produto..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={styles.input}
        />

        <input type="date" onChange={e => setDataInicio(e.target.value)} style={styles.input} />
        <input type="date" onChange={e => setDataFim(e.target.value)} style={styles.input} />

        <button
          onClick={limparFiltro}
          style={{
            ...styles.button,
            width: mobile ? '100%' : 'auto'
          }}
        >
          Limpar
        </button>
      </div>

      <div style={{
        ...styles.cards,
        flexDirection: mobile ? 'column' : 'row'
      }}>
        <Card title="Total" value={`R$ ${total.toFixed(2)}`} />
        <Card title="Lucro" value={`R$ ${lucro.toFixed(2)}`} />
        <Card title="Margem" value={`${margem.toFixed(1)}%`} />
        <Card title="Vendas" value={quantidade} />
        <Card title="Ticket Médio" value={`R$ ${ticket.toFixed(2)}`} />
      </div>

      {vendasSafe.length === 0 && (
        <p style={{ marginTop: 20 }}>Nenhuma venda encontrada</p>
      )}

      {vendasSafe.map((v, i) => {
        const produto = (produtos || []).find(p => p.id == v?.produto_id)

        return (
          <div
            key={v.id}
            style={{
              ...styles.item,
              flexDirection: mobile ? 'column' : 'row',
              alignItems: mobile ? 'flex-start' : 'center',
              opacity: v?.status === 'cancelado' ? 0.5 : 1,
              transform: hover === i ? 'scale(1.02)' : 'scale(1)'
            }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div>
              <strong>{produto?.nome || 'Produto'}</strong><br />

              <span style={{ fontSize: 13, opacity: 0.7 }}>
                {v?.cliente || 'Cliente não informado'}
              </span><br />

              R$ {Number(v?.valor_total || 0).toFixed(2)} | Qtd: {v?.quantidade}
            </div>

            {v?.status !== 'cancelado' && (
              <button
                onClick={() => cancelarVenda(v.id)}
                style={{
                  ...styles.cancelar,
                  width: mobile ? '100%' : 'auto',
                  marginTop: mobile ? 10 : 0
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Carregando...</div>}>
      <HistoricoContent />
    </Suspense>
  )
}

function Card({ title, value }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      style={{
        ...styles.card,
        transform: hover ? 'translateY(-4px)' : 'translateY(0)'
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <p style={styles.cardTitle}>{title}</p>
      <h2 style={styles.cardValue}>{value}</h2>
    </div>
  )
}

const styles = {
  container: {
    padding: 20,
    fontFamily: 'Montserrat',
    color: '#fff'
  },
  title: { marginBottom: 20 },
  filtros: { display: 'flex', gap: 12, marginBottom: 25 },
  input: {
    background: '#1a2438',
    border: '1px solid #2a3a5a',
    padding: '12px',
    borderRadius: 10,
    color: '#fff'
  },
  button: {
    background: '#3b82f6',
    border: 'none',
    padding: '12px',
    borderRadius: 10,
    color: '#fff',
    cursor: 'pointer'
  },
  cards: { display: 'flex', gap: 20, marginBottom: 30 },
  card: {
    background: '#1a2438',
    padding: 20,
    borderRadius: 16,
    minWidth: 160,
    transition: 'all 0.2s ease'
  },
  cardTitle: { opacity: 0.6, fontSize: 13 },
  cardValue: { fontWeight: 600 },
  item: {
    background: '#1a2438',
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    display: 'flex',
    gap: 10,
    transition: 'all 0.2s ease'
  },
  cancelar: {
    background: '#ef4444',
    border: 'none',
    padding: '10px',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer'
  }
}