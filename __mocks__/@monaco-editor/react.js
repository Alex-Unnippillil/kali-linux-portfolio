import React from 'react';
export default function MonacoMock({ value = '', onChange }) {
  return React.createElement('textarea', {
    value,
    onChange: e => onChange && onChange(e.target.value),
  });
}
