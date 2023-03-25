document.addEventListener('DOMContentLoaded', () => {
    this.api = new API();

    this.api.getChannels()
        .then(data => {
            let channels = "";
            for (const [id, name, image] of data) {
                channels += `<div class="channel">
                        <img src="${image}" alt="Channel Logo">
                        <a href="${id}">${name}</a>
                      </div>`
            }

            document.getElementById("channelList").innerHTML = channels;
        })
        .catch(error => alert(error.message || error.toString()));
}, false);