'use client'

export default function Toast({ mensagem, tipo }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: tipo === 'erro' ? '#ef4444' : '#22c55e',
      padding: '12px 18px',
      borderRadius: 10,
      color: '#fff',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      fontFamily: 'Montserrat',
      zIndex: 9999
    }}>
      {mensagem}
    </div>
  )
}