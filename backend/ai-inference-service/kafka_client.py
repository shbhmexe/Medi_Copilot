import os
import json
from confluent_kafka import Producer, Consumer

KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

def get_producer():
    conf = {'bootstrap.servers': KAFKA_BROKER}
    return Producer(conf)

def get_consumer(group_id: str, topics: list):
    conf = {
        'bootstrap.servers': KAFKA_BROKER,
        'group.id': group_id,
        'auto.offset.reset': 'earliest'
    }
    c = Consumer(conf)
    c.subscribe(topics)
    return c

def delivery_report(err, msg):
    if err is not None:
        print(f"Message delivery failed: {err}")
    else:
        print(f"Message delivered to {msg.topic()} [{msg.partition()}]")

def publish_event(topic: str, data: dict):
    """
    Publish an event to a Kafka topic.
    """
    try:
        p = get_producer()
        p.produce(topic, json.dumps(data).encode('utf-8'), callback=delivery_report)
        p.poll(0)
        p.flush()
    except Exception as e:
        print(f"Error publishing to Kafka: {e}")
