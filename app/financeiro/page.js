'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'

export default function Financeiro() {
  const [vendas, setVendas] = useState([])
  const [gastos, setGastos] = useState([])
  const [saldo, setSaldo] = useState(0)

  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('fixo')
  const [dataPagamento, setDataPagamento] = useState('')
  const [ajuste, setAjuste] = useState('')

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const { data: v } = await supabase.from('vendas').select('*')
    const { data: g } = await supabase.from('gastos').select('*')
    const { data: s } = await supabase.from('saldo').select('*').limit(1)

    setVendas(v || [])
    setGastos(g || [])
    setSaldo(s?.[0]?.valor || 0)
  }

  const hoje = new Date().toISOString().split('T')[0]

  const gastosPagos = gastos.filter(g => g.data_pagamento && g.data_pagamento <= hoje)
  const gastosFuturos = gastos.filter(g => g.data_pagamento && g.data_pagamento > hoje)

  const vendasHoje = vendas.filter(v => {
    if (!v.data) return true
    return v.data <= hoje
  })

  const entradas = vendasHoje.reduce((a,v)=>a+Number(v.valor_total||0),0)

  const lucro = vendasHoje.reduce(
    (a,v)=>a+(Number(v.valor_total||0)-Number(v.custo_total||0)),
    0
  )

  const totalGastos = gastosPagos.reduce((a,g)=>a+Number(g.valor||0),0)

  const aPagar = gastosFuturos.reduce((a,g)=>a+Number(g.valor||0),0)

  const disponivel = saldo - aPagar

  const podeInvestir = disponivel > 0 ? disponivel : 0

  async function atualizarSaldo(v) {
    await supabase.from('saldo').update({ valor: v }).neq('id','')
    setSaldo(v)
  }

  async function addGasto() {
    if (!nome || !valor) return

    const dataFinal = dataPagamento || hoje

    const { data } = await supabase
      .from('gastos')
      .insert([{
        nome,
        valor: Number(valor),
        tipo,
        data_pagamento: dataFinal,
        origem: 'manual'
      }])
      .select()
      .single()

    await supabase.from('movimentacoes').insert([{
      tipo: 'saida',
      valor: Number(valor),
      descricao: nome,
      origem: 'gasto',
      gasto_id: data.id
    }])

    if (dataFinal <= hoje) {
      atualizarSaldo(saldo - Number(valor))
    }

    carregar()
  }

  async function deletar(g) {
    await supabase.from('gastos').delete().eq('id', g.id)
    await supabase.from('movimentacoes').delete().eq('gasto_id', g.id)

    if (g.data_pagamento <= hoje) {
      atualizarSaldo(saldo + Number(g.valor))
    }

    carregar()
  }

  async function ajustarSaldo() {
    if (!ajuste) return

    const v = Number(ajuste)
    const novo = saldo + v

    await supabase.from('movimentacoes').insert([{
      tipo: v > 0 ? 'entrada' : 'saida',
      valor: Math.abs(v),
      descricao: 'Ajuste manual',
      origem: 'ajuste'
    }])

    atualizarSaldo(novo)
    setAjuste('')
  }

  const fixos = gastos.filter(g=>g.tipo==='fixo')
  const variaveis = gastos.filter(g=>g.tipo==='variavel')
  const aleatorios = gastos.filter(g=>g.tipo==='aleatorio')

  const dadosPizza = [
    { name:'Fixos', value: fixos.reduce((a,g)=>a+g.valor,0) },
    { name:'Variáveis', value: variaveis.reduce((a,g)=>a+g.valor,0) },
    { name:'Aleatórios', value: aleatorios.reduce((a,g)=>a+g.valor,0) }
  ]

  const cores = ['#3b82f6','#22c55e','#f59e0b']

  return (
    <div style={styles.container}>
      <h1>Financeiro</h1>

      <div style={styles.cards}>
        <Card title="Faturamento" value={entradas}/>
        <Card title="Lucro" value={lucro}/>
        <Card title="Gastos (pagos)" value={totalGastos}/>
        <Card title="Saldo" value={saldo}/>
        <Card title="A pagar" value={aPagar}/>
        <Card title="Disponível" value={disponivel}/>
        <Card title="Pode investir" value={podeInvestir}/>
      </div>

      <div style={styles.box}>
        <input placeholder="Ex: -100 ou 200" value={ajuste} onChange={e=>setAjuste(e.target.value)} />
        <button onClick={ajustarSaldo}>Aplicar ajuste</button>
      </div>

      <div style={styles.box}>
        <input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} />
        <input placeholder="Valor" value={valor} onChange={e=>setValor(e.target.value)} />
        <input type="date" value={dataPagamento} onChange={e=>setDataPagamento(e.target.value)} />

        <select value={tipo} onChange={e=>setTipo(e.target.value)}>
          <option value="fixo">Fixo</option>
          <option value="variavel">Variável</option>
          <option value="aleatorio">Aleatório</option>
        </select>

        <button onClick={addGasto}>Salvar</button>
      </div>

      <div style={styles.grid}>
        <Box title="Fixos" lista={fixos} del={deletar}/>
        <Box title="Variáveis" lista={variaveis} del={deletar}/>
        <Box title="Aleatórios" lista={aleatorios} del={deletar}/>

        <div style={styles.boxCard}>
          <PieChart width={250} height={250}>
            <Pie data={dadosPizza} dataKey="value" outerRadius={90}>
              {dadosPizza.map((_, i)=>(
                <Cell key={i} fill={cores[i % cores.length]} />
              ))}
            </Pie>
            <Tooltip/>
          </PieChart>
        </div>
      </div>
    </div>
  )
}

function Box({title, lista, del}) {
  return (
    <div style={styles.boxCard}>
      <h3>{title}</h3>
      {lista.map(i=>(
        <div key={i.id} style={styles.item}>
          <span>{i.nome}</span>
          <div style={{display:'flex',gap:10}}>
            <span>R$ {i.valor}</span>
            <button style={styles.delete} onClick={()=>del(i)}>x</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Card({title,value}) {
  const [hover, setHover] = useState(false)

  function cor() {
    if (title.includes('Lucro')) return '#22c55e'
    if (title.includes('Faturamento')) return '#3b82f6'
    if (title.includes('Gastos')) return '#ef4444'
    if (title.includes('Saldo')) return '#38bdf8'
    if (title.includes('Disponível')) return '#22c55e'
    if (title.includes('investir')) return '#a855f7'
    return '#fff'
  }

  return (
    <div
      style={{
        ...styles.card,
        transform: hover ? 'translateY(-4px)' : 'none',
        boxShadow: hover ? '0 10px 25px rgba(0,0,0,0.4)' : 'none'
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ fontSize: 13, opacity: 0.6 }}>{title}</div>

      <b style={{
        fontSize: 20,
        color: cor(),
        textShadow: `0 0 8px ${cor()}40`
      }}>
        R$ {Number(value).toFixed(2)}
      </b>
    </div>
  )
}
const styles = {
  container: {
    padding: 40,
    background: 'linear-gradient(180deg, #020617 0%, #0f172a 100%)',
    color: '#fff',
    minHeight: '100vh'
  },

  cards: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 20
  },

  card: {
    background: 'rgba(22, 32, 51, 0.7)',
    padding: 16,
    borderRadius: 14,
    minWidth: 150,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },

  cardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
    border: '1px solid rgba(59,130,246,0.3)'
  },

  box: {
    background: 'rgba(22, 32, 51, 0.7)',
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
    display: 'flex',
    gap: 10,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.05)'
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: 20,
    marginTop: 20
  },

  boxCard: {
    background: 'rgba(22, 32, 51, 0.7)',
    padding: 18,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.2s ease'
  },

  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    background: '#020617'
  },

  delete: {
    background: '#ef4444',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    width: 28,
    height: 28,
    fontWeight: 'bold',
    transition: '0.2s'
  },

  input: {
    padding: 12,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#020617',
    color: '#fff',
    outline: 'none',
    transition: '0.2s'
  },

  select: {
    padding: 12,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#020617',
    color: '#fff'
  },

  button: {
    background: '#22c55e',
    border: 'none',
    padding: '12px 16px',
    borderRadius: 10,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    transition: '0.2s'
  },

  buttonSecondary: {
    background: '#3b82f6',
    border: 'none',
    padding: '12px 16px',
    borderRadius: 10,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    transition: '0.2s'
  }
}