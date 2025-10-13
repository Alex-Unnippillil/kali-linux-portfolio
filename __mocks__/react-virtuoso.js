const React = require('react');

const DefaultList = React.forwardRef(function DefaultList({ children, ...props }, ref) {
  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
});

const DefaultItem = React.forwardRef(function DefaultItem({ children, ...props }, ref) {
  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
});

const VirtuosoGrid = React.forwardRef(function VirtuosoGrid(
  {
    components = {},
    data,
    totalCount = 0,
    itemContent,
    style,
    useWindowScroll: _ignoredUseWindowScroll,
    overscan: _ignoredOverscan,
    ...rest
  },
  ref,
) {
  const ListComponent = components.List || DefaultList;
  const ItemComponent = components.Item || DefaultItem;
  const items = (data && data.length ? data : Array.from({ length: totalCount })).map((item, index) => {
    const content = itemContent ? itemContent(index, item ?? index) : null;
    return (
      <ItemComponent key={index}>
        {content}
      </ItemComponent>
    );
  });

  return (
    <div ref={ref} style={style} {...rest}>
      <ListComponent>{items}</ListComponent>
    </div>
  );
});

module.exports = {
  VirtuosoGrid,
};
