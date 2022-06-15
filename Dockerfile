FROM python:3.7.12

ENV HOSTNAME_L1 testnet-l1
ENV HOSTNAME_L2 testnet-l2

RUN apt update -y && apt upgrade -y && apt install curl git libssl-dev libgmp3-dev -y

# Copy folder
COPY . aave-starknet-bridge
WORKDIR aave-starknet-bridge

# Install Python dependencies
RUN rm -rf .venv && python -m venv .venv
RUN . .venv/bin/activate
RUN python -m pip install --upgrade pip && pip install poetry && poetry install

# Install Node 16
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

# Install Yarn
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \ 
    apt update -y && \
    apt install yarn -y

# Install Node dependencies
RUN yarn

# Build Cairo files
RUN yarn compile:l2