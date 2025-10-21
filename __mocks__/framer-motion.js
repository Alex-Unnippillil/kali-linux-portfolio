const React = require('react');

const STRIP_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'layout',
  'layoutId',
  'whileHover',
  'whileTap',
  'variants',
]);

const motion = new Proxy(
  {},
  {
    get: (_, element) => {
      const MotionComponent = React.forwardRef(({ children, ...props }, ref) => {
        const cleanProps = { ...props };
        for (const key of Object.keys(cleanProps)) {
          if (STRIP_PROPS.has(key)) {
            delete cleanProps[key];
          }
        }
        return React.createElement(element, { ref, ...cleanProps }, children);
      });
      MotionComponent.displayName = `motion.${String(element)}`;
      return MotionComponent;
    },
  },
);

const AnimatePresence = ({ children }) => React.createElement(React.Fragment, null, children);

module.exports = {
  __esModule: true,
  AnimatePresence,
  motion,
};
