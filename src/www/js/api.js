class API {
    async call({ method, path, body }) {
        const res = await fetch(`/api${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (res.status === 204)
            return;

        const json = await res.json();

        if (!res.ok)
            throw new Error(json.error || res.statusText);

        return json;
    }

    async getChannels() {
        return this.call({
            method: 'get',
            path: '/channels',
        }).then(channels => 
            Object.entries(channels)
                .map(([x, y]) => ['/api/channel/' + encodeURIComponent(x.replace('/', '|')) + '.m3u8', y['name'].replace(" HD", ""), y['image']]));
    }

    async getPlaylist() {
        await fetch(`./api/playlist`, {
            method: 'get',
        })
            .then(async res => {
                const contentType = res.headers.get('content-type');

                if (res.status === 204)
                    return undefined;

                if (contentType && contentType.indexOf('application/json') !== -1) {
                    const json = await res.json();

                    if (!res.ok)
                        throw new Error(json.error || res.statusText);

                    return json;
                } else {
                    return res;
                }
            })
            .then(res => res.blob())
            .then(blob => {
                let url = window.URL.createObjectURL(blob);
                let element = document.createElement('a');
                element.href = url;
                element.download = 'playlist.m3u8';
                document.body.appendChild(element);
                element.click();
                element.remove();
            });
    }
}
