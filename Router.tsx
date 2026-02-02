import React, { useState, useEffect } from 'react';
import App from './App';
import History from './pages/History';

const Router: React.FC = () => {
    const [currentPath, setCurrentPath] = useState(window.location.pathname);

    useEffect(() => {
        const handlePopState = () => {
            setCurrentPath(window.location.pathname);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Expose navigation function globally
    (window as any).navigateTo = (path: string) => {
        window.history.pushState({}, '', path);
        setCurrentPath(path);
    };

    if (currentPath === '/history') {
        return <History />;
    }

    return <App />;
};

export default Router;
