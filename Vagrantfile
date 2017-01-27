# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

    config.vm.box = "scotch/box"
    config.vm.network "private_network", ip: "192.168.33.10"
    config.vm.hostname = "scotchbox"
    config.vm.synced_folder ".", "/var/www", :mount_options => ["dmode=777", "fmode=666"]
    
    # Optional NFS. Make sure to remove other synced_folder line too
    #config.vm.synced_folder ".", "/var/www", :nfs => { :mount_options => ["dmode=777","fmode=666"] }

    echo "CREATE USER 'lobster'@'localhost' IDENTIFIED BY 'devpass'" | mysql -uroot -proot
    echo "CREATE DATABASE lobster" | mysql -uroot -proot
    echo "GRANT ALL ON lobster.* TO 'lobster'@'localhost'" | mysql -uroot -proot

end
