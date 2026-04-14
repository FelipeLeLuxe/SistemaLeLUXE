'use client'

import Toast from '../components/Toast'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Estoque() {
  const [produtos, setProdutos] = useState([])
  const [toast, setToast] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [editando, setEditando] = useState(null)
  const [formEdit, setFormEdit] = useState({})

  const [mobile, setMobile] = useState(false)

  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [custo, setCusto] = useState('')
  const [estoque, setEstoque] = useState('')

  useEffect(() => {
    buscarProdutos()

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

  async function buscarProdutos() {
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .order('ordem', { ascending: true })

    setProdutos(data || [])
  }

  async function criarProduto() {
    const novaOrdem = produtos.length

    await supabase.from('produtos').insert([
      {
        nome,
        preco: Number(preco),
        custo: Number(custo || 0),
        estoque: Number(estoque || 0),
        ordem: novaOrdem
      }
    ])

    setNome('')
    setPreco('')
    setCusto('')
    setEstoque('')
    buscarProdutos()
  }

  function iniciarEdicao(p) {
    setEditando(p.id)
    setFormEdit(p)
  }

  async function salvarEdicao() {
    await supabase
      .from('produtos')
      .update({
        nome: formEdit.nome,
        preco: Number(formEdit.preco),
        custo: Number(formEdit.custo)
      })
      .eq('id', editando)

    setEditando(null)
    buscarProdutos()
    mostrarToast('Atualizado')
  }

  async function atualizarEstoque(id, valor) {
    await supabase
      .from('produtos')
      .update({ estoque: Number(valor) })
      .eq('id', id)

    buscarProdutos()
  }

  async function alterarQuantidade(id, atual, tipo) {
    const novo = tipo === 'mais' ? atual + 1 : atual - 1
    if (novo < 0) return

    atualizarEstoque(id, novo)
  }

  async function salvarOrdem(lista) {
    for (let i = 0; i < lista.length; i++) {
      await supabase
        .from('produtos')
        .update({ ordem: i })
        .eq('id', lista[i].id)
    }
  }

  function handleDrop(index) {
    if (dragIndex === null) return

    const nova = [...produtos]
    const item = nova.splice(dragIndex, 1)[0]
    nova.splice(index, 0, item)

    setProdutos(nova)
    setDragIndex(null)

    salvarOrdem(nova)
    mostrarToast('Ordem atualizada')
  }

  async function deletarProduto(id) {
    await supabase.from('produtos').delete().eq('id', id)
    buscarProdutos()
  }

  return (
    <div style={{
      ...styles.container,
      padding: mobile ? 15 : 20
    }}>
      <h1>Estoque</h1>

      <div style={styles.box}>
        <h3>Novo Produto</h3>

        <div style={{
          ...styles.form,
          flexDirection: mobile ? 'column' : 'row'
        }}>
          <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} style={styles.input} />
          <input placeholder="Preço" value={preco} onChange={e => setPreco(e.target.value)} style={styles.input} />
          <input placeholder="Custo" value={custo} onChange={e => setCusto(e.target.value)} style={styles.input} />
          <input placeholder="Estoque" value={estoque} onChange={e => setEstoque(e.target.value)} style={styles.input} />

          <button style={{
            ...styles.button,
            width: mobile ? '100%' : 'auto'
          }} onClick={criarProduto}>
            Adicionar
          </button>
        </div>
      </div>

      <div style={styles.box}>
        <h3>Produtos</h3>

        {produtos.map((p, index) => (
          <div
            key={p.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            style={{
              ...styles.item,
              gridTemplateColumns: mobile ? '1fr' : '1fr 180px 220px'
            }}
          >

            {editando !== p.id ? (
              <>
                <div style={styles.colNome}>
                  <div style={styles.nome}>{p.nome}</div>

                  <div style={{
                    ...styles.valores,
                    flexDirection: mobile ? 'column' : 'row'
                  }}>
                    <span style={styles.preco}>R$ {p.preco}</span>
                    <span style={styles.custo}>Custo: R$ {p.custo}</span>
                  </div>
                </div>

                <div style={styles.colQtd}>
                  <div style={styles.controls}>
                    <button style={styles.qtdBtn} onClick={() => alterarQuantidade(p.id, p.estoque, 'menos')}>-</button>
                    <input value={p.estoque} readOnly style={styles.qtdInput} />
                    <button style={styles.qtdBtn} onClick={() => alterarQuantidade(p.id, p.estoque, 'mais')}>+</button>
                  </div>
                </div>

                <div style={{
                  ...styles.colAcoes,
                  flexDirection: mobile ? 'column' : 'row'
                }}>
                  <button style={styles.edit} onClick={() => iniciarEdicao(p)}>Editar</button>
                  <button style={styles.delete} onClick={() => deletarProduto(p.id)}>Excluir</button>
                </div>
              </>
            ) : (
              <div style={styles.editBox}>
                <input value={formEdit.nome} onChange={e => setFormEdit({ ...formEdit, nome: e.target.value })} style={styles.input} />
                <input value={formEdit.preco} onChange={e => setFormEdit({ ...formEdit, preco: e.target.value })} style={styles.input} />
                <input value={formEdit.custo} onChange={e => setFormEdit({ ...formEdit, custo: e.target.value })} style={styles.input} />

                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={styles.button} onClick={salvarEdicao}>Salvar</button>
                  <button style={styles.cancel} onClick={() => setEditando(null)}>Cancelar</button>
                </div>
              </div>
            )}

          </div>
        ))}
      </div>

      {toast && <Toast mensagem={toast.msg} tipo={toast.tipo} />}
    </div>
  )
}

const styles = {
  container: { padding: 20, color: '#fff' },

  box: {
    background: '#162033',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },

  form: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap'
  },

  input: {
    padding: 12,
    borderRadius: 10,
    border: '1px solid #2a3a5a',
    background: '#1a2438',
    color: '#fff'
  },

  button: {
    background: '#22c55e',
    border: 'none',
    padding: '12px',
    borderRadius: 10,
    color: '#fff'
  },

  cancel: {
    background: '#475569',
    border: 'none',
    padding: '12px',
    borderRadius: 10,
    color: '#fff'
  },

  item: {
    display: 'grid',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    marginTop: 10,
    borderRadius: 10,
    background: '#1a2438'
  },

  colNome: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },

  nome: {
    fontWeight: '600'
  },

  valores: {
    display: 'flex',
    gap: 10
  },

  preco: {
    color: '#22c55e'
  },

  custo: {
    color: '#94a3b8',
    fontSize: 13
  },

  colQtd: {
    display: 'flex',
    justifyContent: 'center'
  },

  colAcoes: {
    display: 'flex',
    gap: 10
  },

  controls: {
    display: 'flex',
    gap: 6,
    background: '#0f172a',
    padding: 6,
    borderRadius: 10
  },

  qtdBtn: {
    width: 36,
    height: 36,
    background: '#3b82f6',
    border: 'none',
    borderRadius: 8,
    color: '#fff'
  },

  qtdInput: {
    width: 50,
    textAlign: 'center',
    background: 'transparent',
    border: 'none',
    color: '#fff'
  },

  edit: {
    background: '#1e293b',
    border: 'none',
    padding: '10px',
    borderRadius: 8,
    color: '#fff'
  },

  delete: {
    background: '#ef4444',
    border: 'none',
    padding: '10px',
    borderRadius: 8,
    color: '#fff'
  },

  editBox: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap'
  }
}