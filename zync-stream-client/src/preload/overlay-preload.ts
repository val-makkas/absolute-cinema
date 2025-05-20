import { contextBridge } from 'electron'
import { overlayControls } from './overlayControls'

contextBridge.exposeInMainWorld('overlayControls', overlayControls)
