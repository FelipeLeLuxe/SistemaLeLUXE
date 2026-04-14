'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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

function getLiquido(v) {
  return Number(v.valor_liquido || v.valor_total)
}

export default function Dashboard() {
  const [produtos, setProdutos] = useState([])
  const [vendas, setVendas] = useState([])
  const [saldo, setSaldo] = useState(0)

  const [mobile, setMobile] = useState(false) // 👈 ADICIONADO

  const router = useRouter()

  useEffect(() => {
    carregar()

    function check() {
      setMobile(window.innerWidth < 768)
    }

    check()
    window.addEventListener('resize', check)

    return () => window.removeEventListener('resize', check)
  }, [])

  async function carregar() {
    const { data: p } = await supabase.from('produtos').select('*')

    const { data: v } = await supabase
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: financeiro } = await supabase
      .from('financeiro')
      .select('*')

    const entradas = (financeiro || [])
      .filter(f => f.tipo === 'entrada')
      .reduce((a, f) => a + Number(f.valor || 0), 0)

    const saidas = (financeiro || [])
      .filter(f => f.tipo === 'saida')
      .reduce((a, f) => a + Number(f.valor || 0), 0)

    setSaldo(entradas - saidas)

    setProdutos(p || [])
    setVendas(v || [])
  }

  function irParaHistorico(filtro) {
    const query = new URLSearchParams(filtro).toString()
    router.push(`/historico?${query}`)
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
    (a, v) => a + getLiquido(v),
    0
  )

  const lucroHoje = vendasHoje.reduce(
    (a, v) => a + (getLiquido(v) - Number(v.custo_total || 0)),
    0
  )

  const vendasMes = vendas.filter(v => {
    const d = new Date(v.created_at)
    return d.getMonth() === hoje.getMonth()
  })

  const faturamentoMes = vendasMes.reduce(
    (a, v) => a + getLiquido(v),
    0
  )

  const lucroMes = vendasMes.reduce(
    (a, v) => a + (getLiquido(v) - Number(v.custo_total || 0)),
    0
  )

  const dias = Array.from({ length: 31 }, (_, i) => i + 1)

  const vendasPorDia = dias.map(dia => {
    return vendasMes
      .filter(v => new Date(v.created_at).getDate() === dia)
      .reduce((a, v) => a + getLiquido(v), 0)
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

  const top3 = produtos
    .map(p => ({
      ...p,
      lucro: Number(p.preco) - Number(p.custo)
    }))
    .sort((a, b) => b.lucro - a.lucro)
    .slice(0, 3)

  return (
    <div style={{
      ...styles.container,
      padding: mobile ? 15 : 40 // 👈 AJUSTE
    }}>
      <h1 style={styles.title}>Dashboard</h1>

      <div style={{
        ...styles.cards,
        flexDirection: mobile ? 'column' : 'row'
      }}>
        <Card title="Estoque" value={estoqueTotal} />
        <Card title="Potencial" value={`R$ ${formatar(valorPotencial)}`} />
        <Card title="Investido" value={`R$ ${formatar(valorInvestido)}`} />
        <Card title="Lucro Potencial" value={`R$ ${formatar(lucroPotencial)}`} destaque />
      </div>

      <div style={styles.box}>
        <h3 style={styles.boxTitle}>🔥 Vendas de Hoje</h3>

        <div style={{
          ...styles.cards,
          flexDirection: mobile ? 'column' : 'row'
        }}>
          <Card title="Faturamento" value={`R$ ${formatar(faturamentoHoje)}`} />
          <Card title="Lucro" value={`R$ ${formatar(lucroHoje)}`} />
          <Card title="Qtd" value={vendasHoje.length} />
        </div>

        <div style={{ marginTop: 20 }}>
          {vendasHoje.map(v => {
            const produto = produtos.find(p => p.id == v.produto_id)

            return (
              <div key={v.id} onClick={() => irParaHistorico({ produto: v.produto_id })}>
                <Item>
                  <span>{produto?.nome}</span>
                  <span>R$ {formatar(getLiquido(v))}</span>
                </Item>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{
        ...styles.grid,
        gridTemplateColumns: mobile ? '1fr' : '1fr 1fr'
      }}>
        <div style={styles.box}>
          <h3 style={styles.boxTitle}>🔥 Mais lucrativos</h3>

          {top3.map(p => (
            <Item key={p.id}>
              <span>{p.nome}</span>
              <span style={{ color: '#22c55e' }}>
                R$ {formatar(p.lucro)}
              </span>
            </Item>
          ))}
        </div>

        <div style={styles.box}>
          <h3 style={styles.boxTitle}>📦 Produtos em estoque</h3>

          <div style={{
            ...styles.gridEstoque,
            gridTemplateColumns: mobile ? '1fr' : '1fr 1fr 1fr'
          }}>
            {produtos.slice(0, 15).map(p => (
              <Item key={p.id}>
                <span>{p.nome}</span>
                <span>{p.estoque} un</span>
              </Item>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        ...styles.grid,
        gridTemplateColumns: mobile ? '1fr' : '1fr 1fr'
      }}>
        <div style={styles.box}>
          <h3 style={styles.boxTitle}>💰 Mês atual</h3>

          <div style={{
            ...styles.cards,
            flexDirection: mobile ? 'column' : 'row'
          }}>
            <Card title="Faturamento" value={`R$ ${formatar(faturamentoMes)}`} />
            <Card title="Lucro" value={`R$ ${formatar(lucroMes)}`} />
            <Card title="Vendas" value={vendasMes.length} />
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

/* COMPONENTES */

function Card({ title, value, destaque, cor }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.card,
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        border: destaque ? '1px solid #3b82f6' : '1px solid #1e293b',
        boxShadow: hover ? '0 10px 25px rgba(0,0,0,0.3)' : 'none'
      }}
    >
      <p style={styles.cardTitle}>{title}</p>
      <h2 style={{ ...styles.cardValue, color: cor || '#fff' }}>
        {value}
      </h2>
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
        background: hover ? '#1e293b' : '#0f172a',
        transform: hover ? 'scale(1.02)' : 'scale(1)'
      }}
    >
      {children}
    </div>
  )
}

/* STYLES */

const styles = {
  container: {
    padding: 40,
    background: '#0f172a',
    minHeight: '100vh',
    color: '#fff'
  },
  title: { marginBottom: 30 },
  cards: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    marginTop: 30
  },
  gridEstoque: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 10
  },
  box: {
    background: '#162033',
    padding: 24,
    borderRadius: 16,
    marginTop: 30,
    border: '1px solid #1e293b'
  },
  boxTitle: { marginBottom: 20 },
  card: {
    background: '#111827',
    padding: 18,
    borderRadius: 14,
    width: 190,
    transition: '0.2s'
  },
  cardTitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700'
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    transition: '0.2s'
  }
}