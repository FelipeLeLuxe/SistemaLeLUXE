'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function formatar(v) {
  return Number(v || 0).toFixed(2)
}

function calcularDataUtil(dataBase, dias) {
  let data = new Date(dataBase)
  let adicionados = 0

  while (adicionados < dias) {
    data.setDate(data.getDate() + 1)
    const dia = data.getDay()
    if (dia !== 0 && dia !== 6) adicionados++
  }

  return data.toISOString().split('T')[0]
}

export default function Pedido() {
  const [tipo, setTipo] = useState('brasil')
  const [itens, setItens] = useState([])
  const [produtos, setProdutos] = useState([])

  const [cotacao, setCotacao] = useState(5)
  const [freteiro, setFreteiro] = useState(20)
  const [freteBrasil, setFreteBrasil] = useState(0)

  const [data, setData] = useState('')
  const [dias, setDias] = useState(3)
  const [previsao, setPrevisao] = useState('')
  const [obs, setObs] = useState('')

  const [pedidos, setPedidos] = useState([])
  const [expandido, setExpandido] = useState(null)

  useEffect(() => {
    carregarPedidos()
    carregarProdutos()
  }, [])

  useEffect(() => {
    if (data) setPrevisao(calcularDataUtil(data, dias))
  }, [data, dias])

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*')
    setProdutos(data || [])
  }

  async function carregarPedidos() {
    const { data } = await supabase
      .from('pedidos')
      .select('*, pedido_itens(*)')
      .order('created_at', { ascending: false })

    setPedidos(data || [])
  }

  function addItem() {
    setItens([...itens, { nome: '', custo: 0, qtd: 1 }])
  }

  function updateItem(i, campo, valor) {
    const copia = [...itens]
    copia[i][campo] = valor
    setItens(copia)
  }

  function calcularTotal() {
    if (tipo === 'brasil') {
      return itens.reduce((a, i) => a + i.custo * i.qtd, 0) + Number(freteBrasil)
    }

    const subtotal = itens.reduce((a, i) => {
      const brl = i.custo * cotacao
      return a + brl * i.qtd
    }, 0)

    const taxa = subtotal * (freteiro / 100)

    return subtotal + taxa + Number(freteBrasil)
  }

  async function salvar() {
    if (!data || itens.length === 0) return alert('Preencha tudo')

    const total = calcularTotal()

    const { data: pedido } = await supabase
      .from('pedidos')
      .insert([{
        tipo,
        data,
        previsao,
        cotacao,
        porcentagem_freteiro: freteiro,
        frete_brasil: freteBrasil,
        total,
        observacoes: obs,
        recebido: false
      }])
      .select()
      .single()

    const itensFormatados = itens.map(i => ({
      pedido_id: pedido.id,
      nome: i.nome,
      custo_brl: tipo === 'paraguai' ? i.custo * cotacao : i.custo,
      quantidade: i.qtd,
      total: i.custo * i.qtd
    }))

    await supabase.from('pedido_itens').insert(itensFormatados)

    const hoje = new Date().toISOString().split('T')[0]

    const { data: gasto } = await supabase
      .from('gastos')
      .insert([{
        nome: `Pedido #${pedido.id}`,
        valor: total,
        tipo: 'variavel',
        origem: 'pedido',
        pedido_id: pedido.id,
        data_pagamento: hoje
      }])
      .select()
      .single()

    await supabase.from('movimentacoes').insert([{
      tipo: 'saida',
      valor: total,
      descricao: `Pedido #${pedido.id}`,
      origem: 'pedido',
      pedido_id: pedido.id,
      gasto_id: gasto.id
    }])

    const { data: s } = await supabase.from('saldo').select('*').limit(1)
    const saldoAtual = s?.[0]?.valor || 0

    await supabase.from('saldo').update({
      valor: saldoAtual - total
    }).neq('id','')

    setItens([])
    setObs('')
    setData('')
    setPrevisao('')

    carregarPedidos()
  }

  async function excluirPedido(p) {
    if (p.recebido) {
      for (let item of p.pedido_itens) {
        const { data: prod } = await supabase
          .from('produtos')
          .select('*')
          .eq('nome', item.nome)

        if (prod?.length) {
          await supabase
            .from('produtos')
            .update({
              estoque: Number(prod[0].estoque) - Number(item.quantidade)
            })
            .eq('id', prod[0].id)
        }
      }
    }

    await supabase.from('movimentacoes').delete().eq('pedido_id', p.id)
    await supabase.from('gastos').delete().eq('pedido_id', p.id)

    await supabase.from('pedidos').delete().eq('id', p.id)
    carregarPedidos()
  }

  function editarPedido(p) {
    setData(p.data)
    setPrevisao(p.previsao)
    setObs(p.observacoes || '')
    setFreteBrasil(p.frete_brasil || 0)

    const itensEdit = p.pedido_itens.map(i => ({
      nome: i.nome,
      custo: i.total / i.quantidade,
      qtd: i.quantidade
    }))

    setItens(itensEdit)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function marcarComoRecebido(pedido) {
    if (pedido.recebido) return

    for (let item of pedido.pedido_itens) {
      const { data: existente } = await supabase
        .from('produtos')
        .select('*')
        .eq('nome', item.nome)

      if (existente?.length) {
        await supabase
          .from('produtos')
          .update({
            estoque: Number(existente[0].estoque || 0) + Number(item.quantidade)
          })
          .eq('id', existente[0].id)
      }
    }

    await supabase
      .from('pedidos')
      .update({ recebido: true })
      .eq('id', pedido.id)

    carregarPedidos()
    carregarProdutos()
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Pedidos</h1>

      <div style={styles.tabs}>
        <button style={tipo === 'brasil' ? styles.tabAtivo : styles.tab} onClick={() => setTipo('brasil')}>
          🇧🇷 Brasil
        </button>

        <button style={tipo === 'paraguai' ? styles.tabAtivo : styles.tab} onClick={() => setTipo('paraguai')}>
          🇵🇾 Paraguai
        </button>
      </div>

      <div style={styles.box}>

        <div style={styles.linha}>

          <div style={styles.field}>
            <label>Data do pedido</label>
            <input type="date" value={data} style={styles.inputDate} onChange={e => setData(e.target.value)} />
          </div>

          <div style={styles.field}>
            <label>Dias úteis</label>
            <select value={dias} style={styles.input} onChange={e => setDias(Number(e.target.value))}>
              {[...Array(12)].map((_, i) => <option key={i}>{i + 1}</option>)}
            </select>
          </div>

          <div style={styles.field}>
            <label>Chegada prevista</label>
            <input type="date" value={previsao} readOnly style={styles.inputDate} />
          </div>

          {tipo === 'paraguai' && (
            <>
              <div style={styles.field}>
                <label>Cotação dólar</label>
                <input style={styles.input} value={cotacao} onChange={e => setCotacao(e.target.value)} />
              </div>

              <div style={styles.field}>
                <label>% freteiro</label>
                <input style={styles.input} value={freteiro} onChange={e => setFreteiro(e.target.value)} />
              </div>
            </>
          )}

          <div style={styles.field}>
            <label>Frete (R$)</label>
            <input style={styles.input} value={freteBrasil} onChange={e => setFreteBrasil(e.target.value)} />
          </div>

        </div>

        <h3 style={{ marginTop: 20 }}>Produtos</h3>

        {itens.map((i, idx) => (
          <div key={idx} style={styles.itemRow}>
            <select style={styles.input} onChange={e => updateItem(idx, 'nome', e.target.value)}>
              <option>Selecionar produto</option>
              {produtos.map(p => <option key={p.id}>{p.nome}</option>)}
            </select>

            <input placeholder="ou digitar" style={styles.input}
              onChange={e => updateItem(idx, 'nome', e.target.value)}
            />

            <input placeholder="Custo" style={styles.input}
              onChange={e => updateItem(idx, 'custo', Number(e.target.value))}
            />

            <input placeholder="Qtd" style={styles.input}
              onChange={e => updateItem(idx, 'qtd', Number(e.target.value))}
            />
          </div>
        ))}

        <button style={styles.addBtn} onClick={addItem}>+ Produto</button>

        <div style={styles.total}>
          Total: R$ {formatar(calcularTotal())}
        </div>

        <textarea style={styles.textarea} placeholder="Observações" value={obs} onChange={e => setObs(e.target.value)} />

        <button style={styles.saveBtn} onClick={salvar}>
          FINALIZAR PEDIDO
        </button>

      </div>

      <div style={{ marginTop: 30 }}>
        {pedidos.map(p => (
          <div key={p.id} style={styles.card}>
            <div style={styles.cardHeader} onClick={() => setExpandido(expandido === p.id ? null : p.id)}>
              <span>
                {p.recebido ? '✅' : '🕒'} {p.tipo === 'brasil' ? '🇧🇷' : '🇵🇾'} Pedido • R$ {formatar(p.total)}
              </span>
              <span>{expandido === p.id ? '▲' : '▼'}</span>
            </div>

            {expandido === p.id && (
              <div>
                {p.pedido_itens.map(i => (
                  <div key={i.id} style={styles.itemCard}>
                    {i.nome} • {i.quantidade}
                  </div>
                ))}

                <div style={styles.actions}>
                  <button style={styles.recebidoBtn} onClick={() => marcarComoRecebido(p)}>
                    Recebido
                  </button>

                  <button style={styles.editBtn} onClick={() => editarPedido(p)}>
                    Editar
                  </button>

                  <button style={styles.deleteBtn} onClick={() => excluirPedido(p)}>
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: 40,
    background: '#0f172a',
    color: '#fff',
    minHeight: '100vh'
  },

  title: {
    marginBottom: 30,
    fontSize: 28,
    fontWeight: 600
  },

  tabs: {
    display: 'flex',
    gap: 10,
    marginBottom: 25
  },

  tab: {
    padding: '10px 16px',
    background: '#1e293b',
    color: '#94a3b8',
    borderRadius: 999,
    cursor: 'pointer',
    border: 'none',
    transition: 'all .2s ease'
  },

  tabAtivo: {
    padding: '10px 16px',
    background: '#2563eb',
    color: '#fff',
    borderRadius: 999,
    border: 'none',
    boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
    transition: 'all .2s ease'
  },

  box: {
    background: '#162033',
    padding: 26,
    borderRadius: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
  },

  linha: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 20
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    color: '#cbd5f5'
  },

  input: {
    padding: 11,
    background: '#020617',
    borderRadius: 10,
    color: '#fff',
    border: '1px solid #1e293b',
    outline: 'none',
    transition: '0.2s'
  },

  inputDate: {
    padding: 11,
    background: '#020617',
    borderRadius: 10,
    color: '#fff',
    border: '1px solid #1e293b'
  },

  itemRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: 12,
    marginTop: 10
  },

  addBtn: {
    marginTop: 12,
    padding: '10px 14px',
    background: '#3b82f6',
    borderRadius: 10,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    transition: '0.2s'
  },

  total: {
    marginTop: 22,
    fontSize: 22,
    fontWeight: 600,
    color: '#22c55e'
  },

  textarea: {
    width: '100%',
    marginTop: 12,
    padding: 12,
    background: '#020617',
    borderRadius: 10,
    color: '#fff',
    border: '1px solid #1e293b'
  },

  saveBtn: {
    marginTop: 18,
    width: '100%',
    padding: 16,
    background: '#22c55e',
    borderRadius: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    border: 'none',
    cursor: 'pointer',
    transition: 'all .2s ease'
  },

  card: {
    background: '#162033',
    padding: 16,
    marginTop: 12,
    borderRadius: 12
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    cursor: 'pointer'
  },

  itemCard: {
    padding: 10,
    background: '#020617',
    marginTop: 6,
    borderRadius: 8
  },

  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 12
  },

  recebidoBtn: {
    background: '#22c55e',
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer'
  },

  editBtn: {
    background: '#3b82f6',
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    color: '#fff'
  },

  deleteBtn: {
    background: '#ef4444',
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer'
  }
}