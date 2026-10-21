FROM php:8.2-apache

# Install required system libraries and PHP extensions (SQLite, MySQL, PDO)
RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    libzip-dev \
    unzip \
    && docker-php-ext-install pdo pdo_sqlite pdo_mysql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable Apache rewrite and headers modules
RUN a2enmod rewrite headers

# Configure Apache to listen on Google Cloud Run $PORT (defaults to 8080)
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# Set document root and working directory
WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html/

# Ensure data directory exists and has write permissions for web server (SQLite)
RUN mkdir -p /var/www/html/data && chown -R www-data:www-data /var/www/html/data /var/www/html

# Cloud Run injects $PORT (default 8080)
ENV PORT=8080
EXPOSE 8080

CMD ["apache2-foreground"]
