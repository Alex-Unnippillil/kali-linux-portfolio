import 'cytoscape';

export {};

declare global {
  namespace cytoscape {
    type Stylesheet = StylesheetCSS;
  }
}
