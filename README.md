# O2 TV IPTV Server

[![Build & Publish Docker Image to Docker Hub](https://github.com/goodbyepavlyi/o2tv-iptvserver/actions/workflows/docker-image.yml/badge.svg)](https://github.com/goodbyepavlyi/o2tv-iptvserver/actions/workflows/docker-image.yml)
[![Docker](https://img.shields.io/docker/v/goodbyepavlyi/o2tv-iptvserver/latest)](https://hub.docker.com/r/goodbyepavlyi/o2tv-iptvserver)
[![Docker](https://img.shields.io/docker/pulls/goodbyepavlyi/o2tv-iptvserver.svg)](https://hub.docker.com/r/goodbyepavlyi/o2tv-iptvserver)
![GitHub Stars](https://img.shields.io/github/stars/goodbyepavlyi/o2tv-iptvserver)

<p align="center">
  <img src="./assets/ui.png" width="802" />
</p>

## Installation

**Note**: Before proceeding, ensure that Docker is installed on your system.

#### 1. Clone the GitHub repository:
```bash
git clone https://github.com/goodbyepavlyi/o2tv-iptvserver
```

#### 2. Run the container:
```bash
docker compose up -d
```

> You have to replace the WEBSERVER_PUBLICURL variable.

#### Installing the Development version

To set up the development version, complete the following steps:

#### 1. Clone the GitHub repository to get the development files:
```bash
git clone -b develop https://github.com/goodbyepavlyi/o2tv-iptvserver
```

#### 2. Run the development container:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## Update

To keep your O2 TV IPTV Server up to date, follow these steps:

#### 1. Pull the Latest Docker Image

```bash
docker-compose pull
```

This command will fetch the latest version of the O2 TV IPTV Server Docker image from the Docker Hub.


#### 2. Restart the Container
```
docker-compose up -d
```

By running this command, you'll restart the O2 TV IPTV Server container with the latest image. Your server will now be running the most recent version.

That's it! Your O2 TV IPTV Server is now updated and ready to go. Enjoy the latest features and improvements.