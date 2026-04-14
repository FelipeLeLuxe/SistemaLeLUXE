'use client'

import Toast from '../components/Toast'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Vendas() {
  const [produtos, setProdutos] = useState([])
  const [vendas, setVendas] = useState([])
  const [toast, setToast] = useState(null)

  const [mobile, setMobile] = useState(false)

  const [busca, setBusca] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [cliente, setCliente] = useState('')
  const [pagamento, setPagamento] = useState('')
  const [parcelas, setParcelas] = useState(1)
  const [observacao, setObservacao] = useState('')
  const [valorManual, setValorManual] = useState('')

  const [vendaSelecionada, setVendaSelecionada] = useState(null)

  useEffect(() => {
    carregarTudo()

    function check() {
      setMobile(window.innerWidth < 768)
    }

    check()
    window.addEventListener('resize', check)

    return () => window.removeEventListener('resize', check)
  }, [])

  function mostrarToast(msg, tipo = 'ok') {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 2000)
  }

  async function carregarTudo() {
    const { data: p } = await supabase.from('produtos').select('*')
    const { data: v } = await supabase
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false })

    setProdutos(p || [])
    setVendas(v || [])
  }

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const produto = produtos.find(p => String(p.id) === String(produtoId))

  const totalPadrao = produto ? produto.preco * quantidade : 0
  const totalFinal = valorManual ? Number(valorManual) : totalPadrao

  const taxas = {
    1: 0.0315,
    2: 0.0539,
    3: 0.0612
  }

  let valorLiquidoPreview = totalFinal

  if (pagamento === 'cartao') {
    const taxa = taxas[parcelas] || 0
    valorLiquidoPreview = totalFinal * (1 - taxa)
  }

  async function vender() {
    if (!produto) return mostrarToast('Escolha um produto', 'erro')
    if (produto.estoque <= 0) return mostrarToast('Sem estoque', 'erro')
    if (produto.estoque < quantidade) return mostrarToast('Estoque insuficiente', 'erro')

    const { error } = await supabase.from('vendas').insert([{
      produto_id: String(produtoId),
      quantidade,
      valor_total: totalFinal,
      valor_liquido: valorLiquidoPreview,
      parcelas: pagamento === 'cartao' ? parcelas : 1,
      custo_total: (produto.custo || 0) * quantidade,
      cliente,
      pagamento,
      observacao
    }])

    if (error) {
      console.log(error)
      return mostrarToast('Erro ao salvar venda', 'erro')
    }

    await supabase
      .from('produtos')
      .update({ estoque: produto.estoque - quantidade })
      .eq('id', produtoId)

    setCliente('')
    setPagamento('')
    setParcelas(1)
    setObservacao('')
    setValorManual('')
    setQuantidade(1)
    setProdutoId('')
    setBusca('')

    await carregarTudo()
    mostrarToast('Venda realizada')
  }

  async function cancelarVenda(v) {
    const { data: produto } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', v.produto_id)
      .single()

    if (produto) {
      await supabase
        .from('produtos')
        .update({
          estoque: Number(produto.estoque) + Number(v.quantidade)
        })
        .eq('id', v.produto_id)
    }

    await supabase.from('vendas').delete().eq('id', v.id)

    await carregarTudo()
    mostrarToast('Venda cancelada', 'erro')
  }

  return (
    <div style={{
      ...styles.container,
      padding: mobile ? 15 : 30
    }}>
      <h1 style={styles.title}>Vendas</h1>

      <div style={{
        ...styles.grid,
        gridTemplateColumns: mobile ? '1fr' : '1fr 1fr'
      }}>
        <div style={styles.card}>
          <h3>Nova Venda</h3>

          <input
            placeholder="Buscar produto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={styles.input}
          />

          <select
            style={styles.input}
            value={produtoId}
            onChange={(e) => setProdutoId(e.target.value)}
          >
            <option value="">Selecionar produto</option>

            {produtosFiltrados.map(p => (
              <option key={p.id} value={p.id} disabled={p.estoque <= 0}>
                {p.nome} • Estoque: {p.estoque}
              </option>
            ))}
          </select>

          <input placeholder="Cliente" value={cliente} onChange={e => setCliente(e.target.value)} style={styles.input} />

          <select value={pagamento} onChange={e => setPagamento(e.target.value)} style={styles.input}>
            <option value="">Forma de pagamento</option>
            <option value="pix">Pix</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartão</option>
          </select>

          {pagamento === 'cartao' && (
            <select value={parcelas} onChange={e => setParcelas(Number(e.target.value))} style={styles.input}>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
            </select>
          )}

          <input type="number" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} style={styles.input} />

          <input placeholder="Valor manual (opcional)" value={valorManual} onChange={e => setValorManual(e.target.value)} style={styles.input} />

          <textarea placeholder="Observações" value={observacao} onChange={e => setObservacao(e.target.value)} style={styles.input} />

          <div style={styles.total}>
            Total: R$ {totalFinal.toFixed(2)}
          </div>

          <div style={{ fontSize: 14, opacity: 0.7 }}>
            Você recebe: R$ {valorLiquidoPreview.toFixed(2)}
          </div>

          <button
            onClick={vender}
            style={{
              ...styles.button,
              padding: mobile ? 18 : 16,
              fontSize: mobile ? 16 : 14
            }}
          >
            Finalizar Venda
          </button>
        </div>

        <div style={styles.card}>
          <h3>Histórico</h3>

          {vendas.map(v => (
            <div style={{
              ...styles.item,
              flexDirection: mobile ? 'column' : 'row',
              alignItems: mobile ? 'flex-start' : 'center'
            }} key={v.id}>
              <div style={{ flex: 1 }}>
                <strong>{v.cliente || 'Sem nome'}</strong>
                <p style={styles.sub}>{v.pagamento}</p>
              </div>

              <span style={styles.valor}>
                R$ {Number(v.valor_liquido || v.valor_total).toFixed(2)}
              </span>

              <button onClick={() => cancelarVenda(v)} style={styles.delete}>
                ❌
              </button>
            </div>
          ))}
        </div>
      </div>

      {toast && <Toast mensagem={toast.msg} tipo={toast.tipo} />}
    </div>
  )
}

const styles = {
  container: { padding: 30, background: '#0b1220', minHeight: '100vh', color: '#fff' },
  title: { marginBottom: 20 },
  grid: { display: 'grid', gap: 20 },
  card: { background: '#111827', padding: 24, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: 12, borderRadius: 10, border: '1px solid #1f2937', background: '#0b1220', color: '#fff' },
  total: { fontSize: 18, fontWeight: 700, color: '#22c55e' },
  button: { borderRadius: 12, background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer', border: 'none' },
  item: { display: 'flex', gap: 10, padding: 12, borderRadius: 10, background: '#0b1220', marginTop: 10 },
  sub: { fontSize: 12, color: '#9ca3af' },
  valor: { fontWeight: 700 },
  delete: { background: '#ef4444', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }
}