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
          if (!ativo) e.currentTarget.style.background = '#111827'
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
        { href: '/historico', label: 'Histórico' }
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
      <body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        
        {/* BOTÃO NOVO */}
        <button
          onClick={() => setSidebarAberta(!sidebarAberta)}
          style={{
            position: 'fixed',
            top: 15,
            left: 15,
            zIndex: 1000,
            background: '#3b82f6',
            border: 'none',
            padding: '10px 12px',
            borderRadius: 8,
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          ☰
        </button>

        <div style={styles.container}>

          <div
            style={{
              ...styles.sidebar,
              width: sidebarAberta ? 230 : 0,
              padding: sidebarAberta ? 20 : 0,
              overflow: 'hidden',
              transition: '0.3s'
            }}
          >

            <div style={styles.logoArea}>
              <div style={styles.logoMain}>Le Luxe</div>
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
    background: '#0f172a'
  },

  sidebar: {
    width: 230,
    background: '#020617',
    padding: 20,
    borderRight: '1px solid #0f172a'
  },

  logoArea: {
    marginBottom: 40,
    textAlign: 'center'
  },

  logoMain: {
    fontFamily: 'Playfair Display, serif',
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '1px'
  },

  logoSub: {
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: '4px',
    marginTop: 6
  },

  menu: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },

  item: {
    position: 'relative',
    padding: '10px 12px',
    borderRadius: 8,
    color: '#cbd5f5',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: '500',
    transition: '0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },

  itemAtivo: {
    background: '#111827',
    color: '#fff'
  },

  barra: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 0,
    background: '#3b82f6',
    borderRadius: 2,
    transition: '0.2s'
  },

  barraAtiva: {
    height: '60%'
  },

  content: {
    flex: 1,
    padding: 20,
    overflow: 'auto',
    background: '#0f172a',
    color: '#fff'
  }
}