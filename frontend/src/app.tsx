import './app.scss'

import type { PropsWithChildren } from 'react'
import ErrorBoundary from './components/ErrorBoundary'

export default function App(props: PropsWithChildren) {
  return <ErrorBoundary>{props.children}</ErrorBoundary>
}
