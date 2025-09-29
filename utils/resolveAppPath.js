import { buildAppMetadata } from '../lib/appRegistry'

const defaultPathForApp = (app) => {
    if (!app || typeof app.id !== 'string') return null
    return `/apps/${app.id}`
}

export const resolveAppPath = (app) => {
    if (!app || typeof app.id !== 'string') return null

    try {
        const meta = buildAppMetadata({
            id: app.id,
            title: app.title || app.id,
            icon: app.icon,
        })
        if (meta && typeof meta.path === 'string' && meta.path) {
            return meta.path
        }
    } catch (error) {
        console.warn('Failed to build app metadata for route resolution', app?.id, error)
    }

    return defaultPathForApp(app)
}

export default resolveAppPath
