'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip
} from 'chart.js'

import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

function formatar(valor) {
  return Number(valor || 0).toFixed(2)
}

export default function Dashboard() {
  const [produtos, setProdutos] = useState([])
  const [vendas, setVendas] = useState([])
  const router = useRouter()

  useEffect(() => {
    carregar()

    const canal = supabase.channel('realtime-vendas')

    canal
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vendas'
        },
        () => {
          carregar()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  function irParaHistorico(filtro) {
    const query = new URLSearchParams(filtro).toString()
    router.push(`/historico?${query}`)
  }

  async function carregar() {
    const { data: p } = await supabase.from('produtos').select('*')

    const { data: v } = await supabase
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false })

    setProdutos(p || [])
    setVendas(v || [])
  }

  const estoqueTotal = produtos.reduce((a, p) => a + Number(p.estoque || 0), 0)

  const valorPotencial = produtos.reduce(
    (a, p) => a + Number(p.preco || 0) * Number(p.estoque || 0),
    0
  )

  const valorInvestido = produtos.reduce(
    (a, p) => a + Number(p.custo || 0) * Number(p.estoque || 0),
    0
  )

  const lucroPotencial = valorPotencial - valorInvestido

  const hoje = new Date()

  const vendasHoje = vendas.filter(v => {
    if (!v.created_at) return false
    const d = new Date(v.created_at)
    return d.toDateString() === hoje.toDateString()
  })

  const faturamentoHoje = vendasHoje.reduce(
    (a, v) => a + Number(v.valor_total || 0),
    0
  )

  const lucroHoje = vendasHoje.reduce(
    (a, v) => a + (Number(v.valor_total || 0) - Number(v.custo_total || 0)),
    0
  )

  const vendasMes = vendas.filter(v => {
    const d = new Date(v.created_at)
    return d.getMonth() === hoje.getMonth()
  })

  const faturamentoMes = vendasMes.reduce(
    (a, v) => a + Number(v.valor_total || 0),
    0
  )

  const lucroMes = vendasMes.reduce(
    (a, v) => a + (Number(v.valor_total || 0) - Number(v.custo_total || 0)),
    0 
  )

  const dias = Array.from({ length: 31 }, (_, i) => i + 1)

  const vendasPorDia = dias.map(dia => {
    return vendasMes
      .filter(v => new Date(v.created_at).getDate() === dia)
      .reduce((a, v) => a + Number(v.valor_total || 0), 0)
  })

  const chartMes = {
    labels: dias,
    datasets: [
      {
        label: 'R$',
        data: vendasPorDia,
        backgroundColor: '#3b82f6'
      }
    ]
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Dashboard</h1>

      <div style={styles.cards}>
        <Card title="Estoque" value={estoqueTotal} />
        <Card title="Potencial" value={`R$ ${formatar(valorPotencial)}`} />
        <Card title="Investido" value={`R$ ${formatar(valorInvestido)}`} />
        <Card title="Lucro Potencial" value={`R$ ${formatar(lucroPotencial)}`} destaque />
      </div>

      <div style={styles.box}>
        <h3 style={styles.boxTitle}>🔥 Vendas de Hoje</h3>

        <div style={styles.cards}>
          <div onClick={() => irParaHistorico({ tipo: 'hoje' })}>
            <Card title="Faturamento" value={`R$ ${formatar(faturamentoHoje)}`} />
          </div>

          <div onClick={() => irParaHistorico({ tipo: 'hoje' })}>
            <Card
              title="Lucro"
              value={`R$ ${formatar(lucroHoje)}`}
              cor={lucroHoje >= 0 ? '#22c55e' : '#ef4444'}
            />
          </div>

          <div onClick={() => irParaHistorico({ tipo: 'hoje' })}>
            <Card title="Qtd" value={vendasHoje.length} />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          {vendasHoje.length === 0 && (
            <p style={{ opacity: 0.5 }}>Nenhuma venda hoje</p>
          )}

          {vendasHoje.map(v => {
            const produto = produtos.find(p => p.id == v.produto_id)

            return (
              <div key={v.id} onClick={() => irParaHistorico({ produto: v.produto_id })}>
                <Item>
                  <span>{produto?.nome}</span>
                  <span>R$ {formatar(v.valor_total)}</span>
                </Item>
              </div>
            )
          })}
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.box}>
          <h3 style={styles.boxTitle}>🔥 Mais lucrativos</h3>

          {produtos
            .map(p => ({
              ...p,
              lucro: Number(p.preco) - Number(p.custo)
            }))
            .sort((a, b) => b.lucro - a.lucro)
            .slice(0, 5)
            .map(p => (
              <div key={p.id} onClick={() => irParaHistorico({ produto: p.id })}>
                <Item>
                  <span>{p.nome}</span>
                  <span style={{ color: '#22c55e' }}>
                    R$ {formatar(p.lucro)}
                  </span>
                </Item>
              </div>
            ))}
        </div>

        <div style={styles.box}>
          <h3 style={styles.boxTitle}>📦 Produtos em estoque</h3>

          {produtos.map(p => (
            <div key={p.id} onClick={() => irParaHistorico({ produto: p.id })}>
              <Item>
                <span>{p.nome}</span>
                <span>{p.estoque} un</span>
              </Item>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.box}>
        <h3 style={styles.boxTitle}>⚠ Baixa margem</h3>

        {produtos.filter(p => ((p.preco - p.custo) / p.preco) * 100 < 30).length === 0 && (
          <p style={{ opacity: 0.5 }}>Tudo saudável</p>
        )}

        {produtos
          .filter(p => ((p.preco - p.custo) / p.preco) * 100 < 30)
          .map(p => {
            const margem = ((p.preco - p.custo) / p.preco) * 100

            return (
              <div key={p.id} onClick={() => irParaHistorico({ produto: p.id })}>
                <Item>
                  <span>{p.nome}</span>
                  <span style={{ color: '#ef4444' }}>
                    {margem.toFixed(1)}%
                  </span>
                </Item>
              </div>
            )
          })}
      </div>

      <div style={styles.grid}>
        <div style={styles.box}>
          <h3 style={styles.boxTitle}>💰 Mês atual</h3>

          <div style={styles.cards}>
            <div onClick={() => irParaHistorico({ tipo: 'mes' })}>
              <Card title="Faturamento" value={`R$ ${formatar(faturamentoMes)}`} />
            </div>

            <div onClick={() => irParaHistorico({ tipo: 'mes' })}>
              <Card title="Lucro" value={`R$ ${formatar(lucroMes)}`} />
            </div>

            <div onClick={() => irParaHistorico({ tipo: 'mes' })}>
              <Card title="Vendas" value={vendasMes.length} />
            </div>
          </div>
        </div>

        <div style={styles.box}>
          <h3 style={styles.boxTitle}>📊 Vendas do mês</h3>
          <Bar data={chartMes} />
        </div>
      </div>
    </div>
  )
}

function Card({ title, value, destaque, cor }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.card,
        transform: hover ? 'scale(1.05)' : 'scale(1)',
        border: destaque ? '1px solid #3b82f6' : 'none',
        cursor: 'pointer'
      }}
    >
      <p style={{ opacity: 0.6 }}>{title}</p>
      <h2 style={{ color: cor || '#fff' }}>{value}</h2>
    </div>
  )
}

function Item({ children }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.item,
        background: hover ? '#1a2438' : '#0f172a',
        cursor: 'pointer'
      }}
    >
      {children}
    </div>
  )
}

const styles = {
  container: {
    padding: 40,
    background: '#0f172a',
    minHeight: '100vh',
    color: '#fff'
  },
  title: {
    marginBottom: 30
  },
  cards: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    marginTop: 30
  },
  box: {
    background: '#162033',
    padding: 24,
    borderRadius: 16,
    marginTop: 30
  },
  boxTitle: {
    marginBottom: 20
  },
  card: {
    background: '#1a2438',
    padding: 18,
    borderRadius: 12,
    width: 180,
    transition: '0.2s'
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginTop: 10
  }
}