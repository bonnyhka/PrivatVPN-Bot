IFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
tc qdisc del dev $IFACE root 2>/dev/null || true
tc qdisc add dev $IFACE root handle 1: htb default 10
tc class add dev $IFACE parent 1: classid 1:1 htb rate 10gbit burst 2m cburst 2m
tc class add dev $IFACE parent 1:1 classid 1:10 htb rate 1000mbit ceil 1000mbit
tc qdisc add dev $IFACE parent 1:10 handle 10: fq_codel
tc filter add dev $IFACE protocol ip parent 1:0 prio 1 handle 10 fw classid 1:10

iptables -t mangle -F
iptables -t mangle -A POSTROUTING -p tcp --sport 443 -j MARK --set-mark 10
iptables -t mangle -A POSTROUTING -p udp --sport 443 -j MARK --set-mark 10
