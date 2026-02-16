const { useState, useCallback } = React;

function BasicCalculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const inputNumber = useCallback((num) => {
    if (waitingForNewValue) {
      setDisplay(String(num));
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  }, [display, waitingForNewValue]);

  const inputOperation = useCallback((nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = {
        '+': (prev, curr) => prev + curr,
        '-': (prev, curr) => prev - curr,
        '*': (prev, curr) => prev * curr,
        '/': (prev, curr) => prev / curr,
        '=': (prev, curr) => curr
      }[operation](currentValue, inputValue);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  }, [display, previousValue, operation]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  }, []);

  const calculate = useCallback(() => {
    inputOperation('=');
    setOperation(null);
    setPreviousValue(null);
    setWaitingForNewValue(true);
  }, [inputOperation]);

  const inputDecimal = useCallback(() => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  }, [display, waitingForNewValue]);

  const buttonStyle = {
    width: '60px',
    height: '60px',
    fontSize: '18px',
    fontWeight: '600',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const numberButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    border: '1px solid #2d2d4a'
  };

  const operatorButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6366f1',
    color: '#ffffff'
  };

  const clearButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ef4444',
    color: '#ffffff'
  };

  const equalsButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#10b981',
    color: '#ffffff'
  };

  const createButton = (value, onClick, style, onHover = '#252540') => {
    return React.createElement('button', {
      onClick: onClick,
      style: style,
      onMouseEnter: (e) => {
        if (style === numberButtonStyle) {
          e.target.style.backgroundColor = onHover;
        }
      },
      onMouseLeave: (e) => {
        e.target.style.backgroundColor = style.backgroundColor;
      }
    }, value);
  };

  return React.createElement('div', {
    className: 'max-w-md mx-auto p-6'
  }, [
    React.createElement('div', {
      key: 'header',
      className: 'mb-6'
    }, [
      React.createElement('h1', {
        key: 'title',
        className: 'text-2xl font-bold text-white mb-2'
      }, 'Basic Calculator'),
      React.createElement('p', {
        key: 'description',
        className: 'text-[#94a3b8]'
      }, 'Perform quick calculations while working in your CRM')
    ]),

    React.createElement('div', {
      key: 'calculator',
      style: {
        backgroundColor: '#1a1a2e',
        border: '1px solid #2d2d4a',
        borderRadius: '8px',
        padding: '20px'
      }
    }, [
      React.createElement('div', {
        key: 'display',
        style: {
          backgroundColor: '#0f0f17',
          border: '1px solid #2d2d4a',
          borderRadius: '4px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'right',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end'
        }
      }, React.createElement('span', {
        style: {
          fontSize: '24px',
          fontWeight: '600',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif'
        }
      }, display)),

      React.createElement('div', {
        key: 'buttons',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px'
        }
      }, [
        createButton('C', clear, clearButtonStyle),
        createButton('±', () => {}, { ...numberButtonStyle, opacity: 0.5 }),
        createButton('%', () => {}, { ...numberButtonStyle, opacity: 0.5 }),
        createButton('÷', () => inputOperation('/'), operatorButtonStyle),

        createButton('7', () => inputNumber(7), numberButtonStyle),
        createButton('8', () => inputNumber(8), numberButtonStyle),
        createButton('9', () => inputNumber(9), numberButtonStyle),
        createButton('×', () => inputOperation('*'), operatorButtonStyle),

        createButton('4', () => inputNumber(4), numberButtonStyle),
        createButton('5', () => inputNumber(5), numberButtonStyle),
        createButton('6', () => inputNumber(6), numberButtonStyle),
        createButton('−', () => inputOperation('-'), operatorButtonStyle),

        createButton('1', () => inputNumber(1), numberButtonStyle),
        createButton('2', () => inputNumber(2), numberButtonStyle),
        createButton('3', () => inputNumber(3), numberButtonStyle),
        createButton('+', () => inputOperation('+'), operatorButtonStyle),

        React.createElement('button', {
          key: 'zero',
          onClick: () => inputNumber(0),
          style: {
            ...numberButtonStyle,
            gridColumn: 'span 2'
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = '#252540';
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = '#1a1a2e';
          }
        }, '0'),
        createButton('.', inputDecimal, numberButtonStyle),
        createButton('=', calculate, equalsButtonStyle)
      ])
    ])
  ]);
}

exports.default = BasicCalculator;