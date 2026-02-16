const { useState } = React;

function SimpleCalculator() {
  const [result, setResult] = useState('');
  const [input, setInput] = useState('');

  const handleButtonClick = (value) => {
    setInput((prev) => prev + value);
  };

  const handleClear = () => {
    setInput('');
    setResult('');
  };

  const handleCalculate = () => {
    try {
      const calcResult = Function('"use strict";return (' + input + ')')();
      setResult(calcResult);
    } catch (error) {
      setResult('Error');
    }
  };

  return (
    React.createElement('div', { className: 'p-4 bg-[#1a1a2e] rounded-lg' },
      React.createElement('h3', { className: 'text-sm font-semibold text-[#94a3b8] mb-4' }, 'Simple Calculator'),
      React.createElement('div', { className: 'mb-4' },
        React.createElement('input', {
          type: 'text',
          value: input,
          readOnly: true,
          className: 'w-full p-2 bg-[#0f0f17] text-[#ffffff] rounded-[4px] border-solid border-[#2d2d4a] mb-2',
        }),
        React.createElement('div', { className: 'text-[#94a3b8] mb-2' }, `Result: ${result}`),
        React.createElement('div', { className: 'flex flex-wrap space-x-2' },
          ['7', '8', '9', '+',
           '4', '5', '6', '-',
           '1', '2', '3', '*',
           '0', '.', '=', '/'].map((value) => (
            React.createElement('button', {
              key: value,
              onClick: value === '=' ? handleCalculate : () => handleButtonClick(value),
              className: 'm-1 p-2 bg-[#252540] text-[#ffffff] rounded-[6px] hover:bg-[#6366f1] focus:outline-none',
            }, value)
          ))
        )
      ),
      React.createElement('button', {
        onClick: handleClear,
        className: 'w-full mt-2 p-2 bg-[#ef4444] text-[#ffffff] rounded-[6px] hover:bg-[#f59e0b] focus:outline-none',
      }, 'Clear')
    )
  );
}

exports.default = SimpleCalculator;