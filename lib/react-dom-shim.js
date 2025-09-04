const ReactDOM = require('next/dist/compiled/react-dom');

ReactDOM.findDOMNode = () => null;

module.exports = ReactDOM;
