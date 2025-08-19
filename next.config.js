const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: "frame-src 'self' https://www.google.com https://todoist.com https://github1s.com https://ghbtns.com;",
    },
];

module.exports = {
    async headers() {
        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
        ];
    },
};

