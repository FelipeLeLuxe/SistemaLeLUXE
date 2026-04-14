'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'

export default function Financeiro() {
  const [vendas, setVendas] = useState([])
  const [gastos, setGastos] = useState([])
  const [contas, setContas] = useState([])

  const [mobile, setMobile] = useState(false)

  const [saldo, setSaldo] = useState(0)
  const [editandoSaldo, setEditandoSaldo] = useState(false)
  const [novoSaldo, setNovoSaldo] = useState('')

  const [abrirGasto, setAbrirGasto] = useState(false)
  const [abrirConta, setAbrirConta] = useState(false)

  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('fixo')

  const [contaNome, setContaNome] = useState('')
  const [contaValor, setContaValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  const [dia, setDia] = useState('')

  const cores = [
    '#3b82f6','#22c55e','#f59e0b','#ef4444',
    '#a855f7','#06b6d4','#84cc16','#f97316'
  ]

  useEffect(() => {
    carregarTudo()

    const salvo = localStorage.getItem('saldo')
    if (salvo) setSaldo(Number(salvo))

    function check() {
      setMobile(window.innerWidth < 768)
    }

    check()
    window.addEventListener('resize', check)

    return () => window.removeEventListener('resize', check)
  }, [])

  function salvarSaldo() {
    localStorage.setItem('saldo', novoSaldo)
    setSaldo(Number(novoSaldo))
    setEditandoSaldo(false)
    setNovoSaldo('')
  }

  function gerarContas(contas) {
    const hoje = new Date()

    return contas.map(c => {
      if (!c.recorrente) return c

      let diaValido = Number(c.dia_vencimento) || hoje.getDate()

      const data = new Date()
      data.setDate(diaValido)

      if (data < hoje) {
        data.setMonth(data.getMonth() + 1)
      }

      return {
        ...c,
        vencimento: data.toISOString(),
        dia_vencimento: diaValido
      }
    })
  }

  async function carregarTudo() {
    const { data: v } = await supabase.from('vendas').select('*')
    const { data: g } = await supabase.from('gastos').select('*')
    const { data: c } = await supabase.from('contas').select('*')

    setVendas(v || [])
    setGastos(g || [])
    setContas(gerarContas(c || []))
  }

  async function addGasto() {
    if (!nome || !valor) return

    const cor = cores[Math.floor(Math.random() * cores.length)]

    await supabase.from('gastos').insert([
      { nome, valor: Number(valor), tipo, cor }
    ])

    setNome('')
    setValor('')
    setAbrirGasto(false)
    carregarTudo()
  }

  async function deleteGasto(id) {
    await supabase.from('gastos').delete().eq('id', id)
    carregarTudo()
  }

  async function addConta() {
    if (!contaNome || !contaValor) return

    const { error } = await supabase.from('contas').insert([
      {
        nome: contaNome,
        valor: Number(contaValor),
        vencimento: vencimento || null,
        recorrente: recorrente === true,
        dia_vencimento: recorrente ? Number(dia) : null
      }
    ])

    if (error) {
      console.error(error)
      alert('Erro ao salvar conta')
      return
    }

    setContaNome('')
    setContaValor('')
    setVencimento('')
    setRecorrente(false)
    setDia('')
    setAbrirConta(false)

    carregarTudo()
  }

  async function deleteConta(id) {
    await supabase.from('contas').delete().eq('id', id)
    carregarTudo()
  }

  const recorrentes = contas.filter(c => c.recorrente)

  const faturamento = vendas.reduce(
    (a, v) => a + Number(v.valor_liquido || v.valor_total || 0),
    0
  )

  const lucro = vendas.reduce(
    (a, v) => a + (
      Number(v.valor_liquido || v.valor_total || 0) -
      Number(v.custo_total || 0)
    ),
    0
  )

  const totalGastos = gastos.reduce((a, g) => a + (g.valor || 0), 0)

  const liquido = lucro - totalGastos

  const dadosPizza = gastos.map(g => ({
    name: g.nome,
    value: g.valor,
    cor: g.cor || '#3b82f6'
  }))

  return (
    <div style={{
      ...styles.container,
      padding: mobile ? 15 : 40
    }}>
      <h1 style={styles.title}>Financeiro</h1>

      <div style={{
        ...styles.cards,
        flexDirection: mobile ? 'column' : 'row'
      }}>
        <Card title="Faturamento" value={faturamento} />
        <Card title="Lucro" value={lucro} />
        <Card title="Gastos" value={totalGastos} />
        <Card title="Líquido" value={liquido} />
        <Card title="Saldo" value={saldo} cor="#60a5fa" />
      </div>

      <div style={styles.boxGrande}>
        <h3>Saldo bancário</h3>

        {!editandoSaldo ? (
          <button style={{
            ...styles.button,
            width: mobile ? '100%' : 'auto'
          }} onClick={() => setEditandoSaldo(true)}>
            Atualizar saldo
          </button>
        ) : (
          <div style={{
            ...styles.formInline,
            flexDirection: mobile ? 'column' : 'row'
          }}>
            <input
              style={styles.input}
              placeholder="Novo saldo"
              value={novoSaldo}
              onChange={e => setNovoSaldo(e.target.value)}
            />
            <button style={styles.button} onClick={salvarSaldo}>
              Salvar
            </button>
          </div>
        )}
      </div>

      <div style={{
        ...styles.grid,
        gridTemplateColumns: mobile ? '1fr' : '1fr 1fr 1fr'
      }}>
        <div style={styles.box}>
          <PieChart width={220} height={220}>
            <Pie data={dadosPizza} dataKey="value" outerRadius={80}>
              {dadosPizza.map((entry, index) => (
                <Cell key={index} fill={entry.cor} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        <div style={styles.box}>
          <div style={styles.header}>
            <h3>Gastos</h3>
            <button style={styles.plus}>+</button>
          </div>

          {gastos.map(g => (
            <div key={g.id} style={styles.item}>
              <span>{g.nome}</span>
              <span>R$ {g.valor}</span>
            </div>
          ))}
        </div>

        <div style={styles.box}>
          <div style={styles.header}>
            <h3>Contas</h3>
            <button style={styles.plus}>+</button>
          </div>

          {contas.map(c => (
            <div key={c.id} style={styles.item}>
              <span>{c.nome}</span>
              <span>R$ {c.valor}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Card({ title, value, cor }) {
  return (
    <div style={{
      background: '#162033',
      padding: 16,
      borderRadius: 12,
      border: cor ? `1px solid ${cor}` : '1px solid #1e293b'
    }}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 'bold', color: cor || '#fff' }}>
        R$ {Number(value).toFixed(2)}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: 40, background: '#0f172a', minHeight: '100vh', color: '#fff' },
  title: { marginBottom: 30 },
  cards: { display: 'flex', gap: 20, marginBottom: 30 },
  grid: { display: 'grid', gap: 20, marginTop: 20 },
  box: { background: '#162033', padding: 16, borderRadius: 14 },
  boxGrande: { background: '#162033', padding: 16, borderRadius: 14, marginBottom: 20 },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 },
  plus: { background: '#3b82f6', border: 'none', width: 36, height: 36, borderRadius: 10, color: '#fff' },
  formInline: { display: 'flex', gap: 10 },
  input: { background: '#0b1220', border: '1px solid #1f2a44', color: '#fff', padding: 12, borderRadius: 10 },
  button: { background: '#22c55e', border: 'none', padding: 12, borderRadius: 10, color: '#fff' },
  item: { background: '#0f172a', padding: 14, borderRadius: 10, marginTop: 10, display: 'flex', justifyContent: 'space-between' }
}