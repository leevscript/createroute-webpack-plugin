<%function recursiveRoutes(routes, tab) {
    let res = ''
    routes.forEach((route, i) => {
      res += tab + '{\n'
      res += tab + '\tpath: ' + JSON.stringify(route.path)
      res += (route.component) ? ',\n\t' + tab + `component: () => import(${JSON.stringify(route.component)})` : ''
      res += (route.redirect) ? ',\n\t' + tab + 'redirect: ' + JSON.stringify(route.redirect) : ''
      res += (route.meta) ? ',\n\t' + tab + 'meta: ' + JSON.stringify(route.meta) : ''
      res += (route.name) ? ',\n\t' + tab + 'name: ' + JSON.stringify(route.name) : ''
      res += (route.children) ? ',\n\t' + tab + 'children: [\n' + recursiveRoutes(routes[i].children, tab + '\t\t') + '\n\t' + tab + ']' : ''
      res += '\n' + tab + '}' + (i + 1 === routes.length ? '' : ',\n')
    })
    return res}%>
export default [
<%=recursiveRoutes(routes, '\t')%>
]



