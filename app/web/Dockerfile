FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY . /usr/share/nginx/html/
RUN rm /usr/share/nginx/html/nginx.conf
