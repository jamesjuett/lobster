    echo "CREATE USER 'lobster'@'localhost' IDENTIFIED BY 'devpass'" | mysql -uroot -proot
    echo "CREATE DATABASE lobster" | mysql -uroot -proot
    echo "GRANT ALL ON lobster.* TO 'lobster'@'localhost'" | mysql -uroot -proot

    mysql -uroot -proot lobster < /var/www/lobster_init.sql

