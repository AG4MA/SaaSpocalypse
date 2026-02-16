const { useState } = React;

function SurpriseBox() {
  const [isOpen, setIsOpen] = useState(false);

  const handleBoxClick = () => {
    setIsOpen(!isOpen);
  };

  return React.createElement('div', { className: 'flex justify-center items-center h-full' },
    React.createElement(Card, { className: 'relative p-4', style: { backgroundColor: '#1a1a2e', borderRadius: '8px' } },
      React.createElement('button', {
        onClick: handleBoxClick,
        className: 'focus:outline-none',
        style: {
          padding: '10px 20px',
          backgroundColor: '#6366f1',
          color: '#ffffff',
          borderRadius: '6px',
        }
      }, isOpen ? '🎉 Opened!' : '🎁 Tap to Open'),

      isOpen && React.createElement('div', { className: 'mt-4 p-3 text-center', style: { backgroundColor: '#252540', borderRadius: '8px' } },
        React.createElement('h2', { className: 'text-2xl text-[#10b981] mb-2' }, 'Happy Birthday! 🎂'),
        React.createElement('p', { className: 'text-[#94a3b8]' }, 'Wishing you a fantastic year ahead!')
      )
    )
  );
}

exports.default = SurpriseBox;