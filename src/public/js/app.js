const ErrorCodes = {
    MalformedRequest: 0,
    NotFound: 404,
    ServerError: 500,
    O2TVAuthenticationFailed: 1000,
};

const Colors = {
    error: "text-red-600",
    success: "text-green-600",
};

$(document).ready(function () {
    $("[data-navbar-toggle]").click(function () {
        $("[data-navbar-mobile]").toggleClass("hidden");
    });

    checkForUpdates();
});

async function checkForUpdates() {
    const currentRelease = await apiRequest({
        method: "GET",
        url: "/api/release",
    }, (error, data) => {
        if (error) {
            displayError(error);
            return;
        }

        if (data.code == 200) {
            return data.version;
        }

        if (data.message) {
            displayMessage(data.message);
            return;
        }
    });

    const latestRelease = await apiRequest({
        method: "GET",
        url: "https://goodbyepavlyi.github.io/o2tv-iptvserver/releases.json", 
    }).then((releases) => {
        const releasesArray = Object.entries(releases).map(([version, changelog]) => ({
            version,
            changelog,
        }));

        const latestReleaseVersion = releasesArray.reduce((latest, release) => {
            return release.version > latest ? release.version : latest;
        }, "0.0.0");

        const latestRelease = releasesArray.find((release) => release.version === latestReleaseVersion);
        return latestRelease;
    });

    console.log(`Current Release: ${currentRelease}, Latest Release: ${latestRelease.version}`);

    if (currentRelease >= latestRelease.version) 
        return;

    $("[data-updater-changelog]").text(latestRelease.changelog);
    $("[data-updater]").show();
}

function apiRequest(options, callback) {
    const requestOptions = {
        method: options.method || "GET",
        headers: options.headers,
        cache: "no-cache"
    };

    if (options.body && requestOptions.method != "GET")
        requestOptions.body = JSON.stringify(options.body);

    return fetch(options.url, requestOptions)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            if (!callback)
                return data;

            if (data.code != 200)
                return callback(data);

            return callback(null, data);
        })
        .catch((error) => {
            if (!callback)
                return console.error("API Error:", error);

            return callback(error);
        });
}

function displayError(error, hideTimeout) {
    if (!error)
        return;

    console.error(error);

    const userNotifyElement = $("[data-userNotifyText]");
    let message = "An unexpected error occurred. If the problem persists, review the application logs.";

    switch (error.code) {
        case ErrorCodes.MalformedRequest:
            message = "The request format is malformed. Please ensure your request follows the correct format.";
            break;
        case ErrorCodes.NotFound:
            message = "The requested resource was not found.";
            break;
        case ErrorCodes.ServerError:
            message = "An internal server error occurred. Please try again later.";
            break;
        case ErrorCodes.O2TVAuthenticationFailed:
            message = "Authentication with O2 TV was not successful. Please verify your credentials otherwise review the application logs.";
            break;
    }

    setTimeout(() => userNotifyElement.fadeOut(), hideTimeout || 5000);
    return userNotifyElement.removeClass(Colors.success).addClass(Colors.error).text(message).fadeIn();
}

function displayMessage(message, hideTimeout) {
    if (!message)
        return;

    const userNotifyElement = $("[data-userNotifyText]");

    setTimeout(() => userNotifyElement.fadeOut(), hideTimeout || 5000);
    return userNotifyElement.removeClass(Colors.error).addClass(Colors.success).text(message).fadeIn();
}
