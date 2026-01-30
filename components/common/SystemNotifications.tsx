"use client";

import { useEffect } from 'react';
import { useNotifications, PushNotificationInput } from '../../hooks/useNotifications';

export const SystemNotifications = () => {
    const { pushNotification } = useNotifications();

    useEffect(() => {
        const handleSystemNotification = (event: Event) => {
            const customEvent = event as CustomEvent<PushNotificationInput>;
            if (customEvent.detail) {
                pushNotification(customEvent.detail);
            }
        };

        window.addEventListener('system-notification', handleSystemNotification);

        // Initial Welcome Notification
        const timer = setTimeout(() => {
            pushNotification({
                appId: 'system',
                title: 'Welcome to Kali Linux Portfolio',
                body: 'Explore the applications, try the terminal, and check out the new features!',
                priority: 'normal',
            });
        }, 1500);

        return () => {
            window.removeEventListener('system-notification', handleSystemNotification);
            clearTimeout(timer);
        };
    }, [pushNotification]);

    return null;
};

export default SystemNotifications;
