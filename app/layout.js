'use client'

import './globals.css'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function RootLayout({ children }) {
  const pathname = usePathname()

  const [sidebarAberta, setSidebarAberta] = useState(true)

  function Item({ href, label }) {
    const ativo = pathname === href

    return (
      <a
        href={href}
        style={{
          ...styles.item,
          ...(ativo && styles.itemAtivo)
        }}
        onMouseEnter={e => {
          if (!ativo) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        }}
        onMouseLeave={e => {
          if (!ativo) e.currentTarget.style.background = 'transparent'
        }}
      >
        <div style={{
          ...styles.barra,
          ...(ativo && styles.barraAtiva)
        }} />
        {label}
      </a>
    )
  }

  const [menuItems, setMenuItems] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('menuOrder')

    if (saved) {
      setMenuItems(JSON.parse(saved))
    } else {
      setMenuItems([
        { href: '/', label: 'Dashboard' },
        { href: '/vendas', label: 'Vendas' },
        { href: '/financeiro', label: 'Financeiro' },
        { href: '/estoque', label: 'Estoque' },
        { href: '/historico', label: 'Histórico' },
        { href: '/pedido', label: 'Pedidos' }
      ])
    }
  }, [])

  function handleDragStart(e, index) {
    e.dataTransfer.setData('index', index)
  }

  function handleDrop(e, index) {
    const from = e.dataTransfer.getData('index')
    const updated = [...menuItems]

    const item = updated.splice(from, 1)[0]
    updated.splice(index, 0, item)

    setMenuItems(updated)
    localStorage.setItem('menuOrder', JSON.stringify(updated))
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  return (
    <html lang="pt-br">
      <body>

        <button
          onClick={() => setSidebarAberta(!sidebarAberta)}
          style={styles.toggle}
        >
          ☰
        </button>

        <div style={styles.container}>

          <div
            style={{
              ...styles.sidebar,
              width: sidebarAberta ? 240 : 0,
              padding: sidebarAberta ? 20 : 0,
              overflow: 'hidden'
            }}
          >

            <div style={styles.logoArea}>
              <div style={styles.logoMain}>LE LUXE</div>
              <div style={styles.logoSub}>PARFUMS</div>
            </div>

            <div style={styles.menu}>
              {menuItems.map((item, index) => (
                <div
                  key={item.href}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragOver={handleDragOver}
                >
                  <Item href={item.href} label={item.label} />
                </div>
              ))}
            </div>

          </div>

          <div style={styles.content}>
            {children}
          </div>

        </div>

      </body>
    </html>
  )
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    background: 'var(--bg-main)'
  },

  sidebar: {
    background: 'rgba(2,6,23,0.8)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid var(--border-default)',
    transition: '0.3s ease'
  },

  logoArea: {
    marginBottom: 25,
    textAlign: 'center'
  },

  logoMain: {
    fontFamily: 'Cormorant Garamond, serif',
    fontSize: 24,
    fontWeight: 300,
    letterSpacing: '2px',
    background: 'linear-gradient(90deg, #f5d78e, #d4af37)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textRendering: 'optimizeLegibility'
  },

  logoSub: {
    fontSize: 8,
    color: '#94a3b8',
    letterSpacing: '4px',
    marginTop: 2
  },

  menu: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },

  item: {
    position: 'relative',
    padding: '10px 14px',
    borderRadius: 10,
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center'
  },

  itemAtivo: {
    background: 'rgba(0,255,156,0.08)',
    color: '#fff',
    boxShadow: '0 0 10px rgba(0,255,156,0.08)'
  },

  barra: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 0,
    background: 'var(--primary)',
    borderRadius: 2,
    transition: '0.2s'
  },

  barraAtiva: {
    height: '60%'
  },

  content: {
    flex: 1,
    padding: 24,
    overflow: 'auto',
    background: 'var(--bg-main)',
    color: '#fff'
  },

  toggle: {
    position: 'fixed',
    top: 15,
    left: 15,
    zIndex: 1000,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-default)',
    padding: '10px 12px',
    borderRadius: 10,
    color: '#fff',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)'
  }
}