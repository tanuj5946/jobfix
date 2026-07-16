import logging
import time

from langgraph.graph import END, START, StateGraph

from assessment_engine.chains.job_description_analysis_chain import (
    build_job_description_analysis_chain,
)
from assessment_engine.graph.job_analysis_state import JobAnalysisState
from shared.cache import llm_cache
from shared.observability import log_event, metrics_registry

logger = logging.getLogger("ai-service")
job_description_analysis_chain = build_job_description_analysis_chain()


def analyze_job_description(state: JobAnalysisState) -> dict:
    payload = {"title": state["title"], "description": state["description"]}
    start_time = time.perf_counter()
    result = llm_cache.get_or_set(
        {"chain": "job_description_analysis", **payload},
        lambda: job_description_analysis_chain.invoke(payload),
    )
    latency_ms = (time.perf_counter() - start_time) * 1000
    metrics_registry.observe("job_description_analysis_latency_ms", latency_ms)
    log_event(
        logger,
        logging.INFO,
        "job_description_analysis_completed",
        llm_latency_ms=round(latency_ms, 2),
    )

    return result.model_dump()


def build_job_analysis_graph():
    graph = StateGraph(JobAnalysisState)
    graph.add_node("job_description_analysis", analyze_job_description)
    graph.add_edge(START, "job_description_analysis")
    graph.add_edge("job_description_analysis", END)
    return graph.compile()
