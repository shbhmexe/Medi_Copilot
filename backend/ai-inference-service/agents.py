import os
import json
import asyncio
import uuid
import re
from pathlib import Path
from typing import AsyncGenerator
from dotenv import load_dotenv

try:
    from langchain_groq import ChatGroq
    from langchain_core.prompts import PromptTemplate
except ImportError:
    ChatGroq = None
    PromptTemplate = None

try:
    from neo4j import AsyncGraphDatabase
except ImportError:
    AsyncGraphDatabase = None

try:
    from qdrant_client import QdrantClient
except ImportError:
    QdrantClient = None

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

def _get_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value if value else None


# Secrets/config are loaded from environment variables only.
GROQ_API_KEY = _get_env("GROQ_API_KEY")
if GROQ_API_KEY:
    os.environ["GROQ_API_KEY"] = GROQ_API_KEY

# Initialize Neo4j Driver (Async)
NEO4J_URI = _get_env("NEO4J_URI")
NEO4J_USER = _get_env("NEO4J_USER")
NEO4J_PASSWORD = _get_env("NEO4J_PASSWORD")

try:
    if AsyncGraphDatabase and NEO4J_URI and NEO4J_USER and NEO4J_PASSWORD:
        driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    else:
        driver = None
except Exception as e:
    print(f"Neo4j Startup Error: {e}")
    driver = None

# Initialize Qdrant Client (Live Database)
QDRANT_URL = _get_env("QDRANT_URL")
QDRANT_API_KEY = _get_env("QDRANT_API_KEY")

try:
    if QdrantClient and QDRANT_URL and QDRANT_API_KEY:
        qdrant_client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY
        )
    else:
        qdrant_client = None
except Exception as e:
    print(f"Qdrant Startup Error: {e}")
    qdrant_client = None

DRUG_GRAPH_SEED = [
    {
        "drug_a": "Warfarin",
        "drug_b": "Ibuprofen",
        "severity": "major",
        "mechanism": "Combined anticoagulant and NSAID exposure can substantially increase gastrointestinal and systemic bleeding risk.",
        "clinical_significance": "Avoid together when possible. If unavoidable, monitor closely for bleeding and review the need for gastroprotection.",
        "alternative_suggested": "Prefer paracetamol for analgesia if clinically appropriate.",
    },
    {
        "drug_a": "Warfarin",
        "drug_b": "Diclofenac",
        "severity": "major",
        "mechanism": "Diclofenac, like other NSAIDs, increases bleeding risk when combined with warfarin.",
        "clinical_significance": "This is a high-risk combination and should only be used with strong clinical justification and close monitoring.",
        "alternative_suggested": "Use a non-NSAID analgesic when feasible.",
    },
    {
        "drug_a": "Warfarin",
        "drug_b": "Metronidazole",
        "severity": "major",
        "mechanism": "Metronidazole can inhibit warfarin metabolism and raise anticoagulant exposure.",
        "clinical_significance": "INR can rise substantially. Avoid routine co-prescribing or intensify INR monitoring if used together.",
        "alternative_suggested": "Consider an alternative antimicrobial or adjust the anticoagulation plan with clinician oversight.",
    },
    {
        "drug_a": "Warfarin",
        "drug_b": "Sulfamethoxazole/Trimethoprim",
        "severity": "major",
        "mechanism": "Sulfamethoxazole/trimethoprim may prolong prothrombin time and potentiate warfarin effect.",
        "clinical_significance": "Bleeding risk rises meaningfully; INR reassessment is required if this combination is used.",
        "alternative_suggested": "Use a non-interacting antibiotic when clinically suitable or monitor INR closely.",
    },
    {
        "drug_a": "Warfarin",
        "drug_b": "Clarithromycin",
        "severity": "moderate",
        "mechanism": "Clarithromycin can potentiate oral anticoagulant effect and increase bleeding risk.",
        "clinical_significance": "Prothrombin time and INR should be monitored closely if the combination is necessary.",
        "alternative_suggested": "Consider a non-macrolide option when clinically appropriate.",
    },
    {
        "drug_a": "Azithromycin",
        "drug_b": "Ondansetron",
        "severity": "major",
        "mechanism": "Both agents can prolong the QT interval and increase torsades de pointes risk in susceptible patients.",
        "clinical_significance": "Review cardiac history, electrolytes, and other QT-risk factors before co-prescribing.",
        "alternative_suggested": "Choose a non-QT-prolonging antiemetic or antibiotic when feasible.",
    },
    {
        "drug_a": "Ciprofloxacin",
        "drug_b": "Ondansetron",
        "severity": "major",
        "mechanism": "Additive QT-prolonging effects may raise serious arrhythmia risk.",
        "clinical_significance": "Use only when clearly necessary and consider ECG/electrolyte review in at-risk patients.",
        "alternative_suggested": "Review the antibiotic choice or antiemetic alternative.",
    },
    {
        "drug_a": "Ibuprofen",
        "drug_b": "Aspirin",
        "severity": "moderate",
        "mechanism": "Ibuprofen can interfere with aspirin antiplatelet activity and add gastrointestinal toxicity.",
        "clinical_significance": "Avoid routine concomitant use unless benefit clearly outweighs risk; timing separation may reduce but not remove risk.",
        "alternative_suggested": "Consider paracetamol or a clinician-reviewed dosing strategy.",
    },
    {
        "drug_a": "Ibuprofen",
        "drug_b": "Lisinopril",
        "severity": "moderate",
        "mechanism": "NSAIDs may blunt the antihypertensive effect of ACE inhibitors and can worsen renal perfusion.",
        "clinical_significance": "Monitor blood pressure and renal function if this combination is needed, especially during dehydration or chronic use.",
        "alternative_suggested": "Prefer the shortest NSAID exposure possible or a non-NSAID analgesic.",
    },
    {
        "drug_a": "Ibuprofen",
        "drug_b": "Spironolactone",
        "severity": "moderate",
        "mechanism": "NSAID exposure can worsen renal function and complicate potassium handling during spironolactone therapy.",
        "clinical_significance": "Check renal function and potassium if the combination cannot be avoided.",
        "alternative_suggested": "Consider paracetamol or reduce NSAID exposure where clinically possible.",
    },
    {
        "drug_a": "Spironolactone",
        "drug_b": "Lisinopril",
        "severity": "major",
        "mechanism": "Combined potassium-sparing and renin-angiotensin system blockade increases hyperkalemia risk.",
        "clinical_significance": "This combination requires potassium and renal-function monitoring and may be unsafe in higher-risk patients.",
        "alternative_suggested": "Use only with a clear indication and structured electrolyte follow-up.",
    },
    {
        "drug_a": "Spironolactone",
        "drug_b": "Losartan",
        "severity": "major",
        "mechanism": "Spironolactone plus ARB therapy can significantly increase potassium and renal-risk burden.",
        "clinical_significance": "Monitor potassium and creatinine closely and avoid unnecessary potassium supplementation.",
        "alternative_suggested": "Consider whether dual RAAS/potassium-sparing therapy is truly indicated.",
    },
    {
        "drug_a": "Amlodipine",
        "drug_b": "Simvastatin",
        "severity": "moderate",
        "mechanism": "Amlodipine increases simvastatin exposure, which can raise myopathy risk.",
        "clinical_significance": "Simvastatin dose should not exceed the recommended limit when co-administered with amlodipine.",
        "alternative_suggested": "Reduce simvastatin exposure or consider another statin if clinically suitable.",
    },
    {
        "drug_a": "Clarithromycin",
        "drug_b": "Simvastatin",
        "severity": "major",
        "mechanism": "Clarithromycin is a strong CYP3A4 inhibitor and can markedly increase simvastatin exposure.",
        "clinical_significance": "This combination is contraindicated because of high myopathy and rhabdomyolysis risk.",
        "alternative_suggested": "Suspend simvastatin during clarithromycin therapy or choose a non-interacting antibiotic/statin plan.",
    },
    {
        "drug_a": "Digoxin",
        "drug_b": "Amiodarone",
        "severity": "major",
        "mechanism": "Amiodarone can substantially increase digoxin concentrations.",
        "clinical_significance": "Digoxin levels and toxicity risk may rise quickly; dose reduction and monitoring are typically required.",
        "alternative_suggested": "Reduce digoxin dose and monitor serum concentrations if co-administration is necessary.",
    },
    {
        "drug_a": "Digoxin",
        "drug_b": "Clarithromycin",
        "severity": "moderate",
        "mechanism": "Clarithromycin can increase digoxin exposure via P-glycoprotein inhibition.",
        "clinical_significance": "Monitor for digoxin toxicity and consider serum-level monitoring during concomitant use.",
        "alternative_suggested": "Prefer a non-interacting antibiotic when feasible.",
    },
    {
        "drug_a": "Digoxin",
        "drug_b": "Atorvastatin",
        "severity": "moderate",
        "mechanism": "Atorvastatin can modestly increase digoxin exposure.",
        "clinical_significance": "Usually manageable, but digoxin has a narrow therapeutic index and may need closer monitoring.",
        "alternative_suggested": "Continue with serum digoxin review if symptoms or high-risk features are present.",
    },
    {
        "drug_a": "Rivaroxaban",
        "drug_b": "Ibuprofen",
        "severity": "major",
        "mechanism": "Rivaroxaban plus NSAID therapy increases bleeding risk through combined hemostatic impairment.",
        "clinical_significance": "Avoid routine combination unless clearly indicated and bleeding risk is acceptable.",
        "alternative_suggested": "Consider paracetamol instead of an NSAID when appropriate.",
    },
    {
        "drug_a": "Rivaroxaban",
        "drug_b": "Aspirin",
        "severity": "moderate",
        "mechanism": "Aspirin adds antiplatelet effect and increases bleeding risk during rivaroxaban therapy.",
        "clinical_significance": "This may be intentional in some cardiovascular indications, but bleeding risk still rises and must be justified.",
        "alternative_suggested": "Use only when the indication for dual pathway inhibition is clear and actively monitored.",
    },
]

COMMON_DRUGS = sorted({
    "Amlodipine",
    "Amiodarone",
    "Amoxicillin",
    "Amoxicillin/Clavulanate",
    "Aspirin",
    "Atorvastatin",
    "Azithromycin",
    "Cefixime",
    "Cetirizine",
    "Clarithromycin",
    "Diclofenac",
    "Digoxin",
    "Doxycycline",
    "Ibuprofen",
    "Lisinopril",
    "Losartan",
    "Metformin",
    "Metronidazole",
    "Omeprazole",
    "Ondansetron",
    "Oral rehydration solution",
    "Pantoprazole",
    "Paracetamol",
    "Rivaroxaban",
    "Simvastatin",
    "Spironolactone",
    "Sulfamethoxazole/Trimethoprim",
    "Warfarin",
    *[seed["drug_a"] for seed in DRUG_GRAPH_SEED],
    *[seed["drug_b"] for seed in DRUG_GRAPH_SEED],
})

DRUG_NAME_ALIASES = {
    "acetaminophen": "Paracetamol",
    "co-trimoxazole": "Sulfamethoxazole/Trimethoprim",
    "cotrimoxazole": "Sulfamethoxazole/Trimethoprim",
    "ors": "Oral rehydration solution",
    "sulfamethoxazole trimethoprim": "Sulfamethoxazole/Trimethoprim",
    "trimethoprim sulfamethoxazole": "Sulfamethoxazole/Trimethoprim",
    "trimethoprim-sulfamethoxazole": "Sulfamethoxazole/Trimethoprim",
    "tmp-smx": "Sulfamethoxazole/Trimethoprim",
    "zofran": "Ondansetron",
}

_CANONICAL_DRUG_MAP = {drug.lower(): drug for drug in COMMON_DRUGS}
DRUG_MATCH_TERMS = sorted({*COMMON_DRUGS, *DRUG_NAME_ALIASES.keys()}, key=len, reverse=True)


def canonicalize_drug_name(name: str) -> str:
    cleaned = re.sub(r"\s+", " ", name.strip())
    if not cleaned:
        return ""

    lowered = cleaned.lower()
    if lowered in DRUG_NAME_ALIASES:
        return DRUG_NAME_ALIASES[lowered]
    if lowered in _CANONICAL_DRUG_MAP:
        return _CANONICAL_DRUG_MAP[lowered]
    return cleaned

_drug_graph_seed_lock = asyncio.Lock()
_drug_graph_seeded = False


async def get_drug_graph_stats() -> dict:
    if not driver:
        return {
            "connected": False,
            "seeded": False,
            "drug_count": 0,
            "interaction_count": 0,
        }

    query = """
    OPTIONAL MATCH (d:Drug)
    WITH count(d) AS drug_count
    OPTIONAL MATCH (:Drug)-[r:INTERACTS_WITH]-(:Drug)
    RETURN drug_count, count(r) AS interaction_count
    """

    try:
        async with driver.session() as session:
            result = await session.run(query)
            record = await result.single()
            drug_count = int(record["drug_count"]) if record else 0
            interaction_count = int(record["interaction_count"]) if record else 0
            return {
                "connected": True,
                "seeded": drug_count > 0 and interaction_count > 0,
                "drug_count": drug_count,
                "interaction_count": interaction_count,
            }
    except Exception as e:
        print(f"Neo4j Stats Error: {e}")
        return {
            "connected": True,
            "seeded": False,
            "drug_count": 0,
            "interaction_count": 0,
        }


async def ensure_drug_graph_seeded(force: bool = False) -> dict:
    global _drug_graph_seeded

    if not driver:
        return {
            "connected": False,
            "seeded": False,
            "drug_count": 0,
            "interaction_count": 0,
        }

    async with _drug_graph_seed_lock:
        if _drug_graph_seeded and not force:
            return await get_drug_graph_stats()

        try:
            async with driver.session() as session:
                await session.run(
                    "CREATE CONSTRAINT drug_name_unique IF NOT EXISTS FOR (d:Drug) REQUIRE d.name IS UNIQUE"
                )
                await session.run(
                    """
                    UNWIND $drugs AS drug_name
                    MERGE (d:Drug {name: drug_name})
                    SET d.name_lower = toLower(drug_name),
                        d.updated_at = datetime()
                    """,
                    drugs=COMMON_DRUGS,
                )
                await session.run(
                    """
                    UNWIND $pairs AS pair
                    MATCH (drugA:Drug {name: pair.drug_a})
                    MATCH (drugB:Drug {name: pair.drug_b})
                    MERGE (drugA)-[r:INTERACTS_WITH]-(drugB)
                    SET r.severity = pair.severity,
                        r.mechanism = pair.mechanism,
                        r.clinical_significance = pair.clinical_significance,
                        r.alternative_suggested = pair.alternative_suggested,
                        r.updated_at = datetime()
                    """,
                    pairs=DRUG_GRAPH_SEED,
                )
            _drug_graph_seeded = True
        except Exception as e:
            print(f"Neo4j Drug Seed Error: {e}")

        return await get_drug_graph_stats()


async def check_drug_interactions(drug_list: list) -> list:
    """Queries Neo4j AuraDB for known polypharmacy interactions based on list of extracted drugs."""
    if not driver or len(drug_list) < 2:
        return []

    await ensure_drug_graph_seeded()

    interactions = []
    try:
        query = """
        MATCH (d1:Drug)-[r:INTERACTS_WITH]-(d2:Drug)
        WHERE toLower(d1.name) IN $drug_list
          AND toLower(d2.name) IN $drug_list
          AND toLower(d1.name) < toLower(d2.name)
        RETURN DISTINCT
          d1.name as drug_a,
          d2.name as drug_b,
          coalesce(r.severity, "moderate") as severity,
          coalesce(r.mechanism, "Potential pharmacologic interaction.") as mechanism,
          coalesce(r.clinical_significance, "Review this combination clinically before prescribing.") as clinical_significance,
          coalesce(r.alternative_suggested, r.alternative, null) as alternative_suggested
        """
        normalized_drug_list: list[str] = []
        seen: set[str] = set()
        for drug in drug_list:
            canonical = canonicalize_drug_name(drug)
            if not canonical:
                continue
            key = canonical.lower()
            if key in seen:
                continue
            seen.add(key)
            normalized_drug_list.append(key)
        async with driver.session() as session:
            result = await session.run(query, drug_list=normalized_drug_list)
            async for record in result:
                interactions.append({
                    "drug_a": record["drug_a"],
                    "drug_b": record["drug_b"],
                    "severity": record["severity"],
                    "mechanism": record["mechanism"],
                    "clinical_significance": record["clinical_significance"],
                    "alternative_suggested": record["alternative_suggested"],
                })
    except Exception as e:
        print(f"Neo4j Error: {e}")

    return interactions


async def search_drug_catalog(query_text: str, limit: int = 10) -> list[str]:
    search_term = query_text.strip().lower()
    if len(search_term) < 2:
        return []

    matches: list[str] = []
    seen: set[str] = set()

    if driver:
        await ensure_drug_graph_seeded()
        try:
            query = """
            MATCH (d:Drug)
            WHERE toLower(d.name) CONTAINS $search_term
            RETURN DISTINCT d.name AS name
            ORDER BY CASE WHEN toLower(d.name) STARTS WITH $search_term THEN 0 ELSE 1 END, d.name
            LIMIT $limit
            """
            async with driver.session() as session:
                result = await session.run(query, search_term=search_term, limit=limit)
                async for record in result:
                    name = (record.get("name") or "").strip()
                    if name and name.lower() not in seen:
                        seen.add(name.lower())
                        matches.append(name)
        except Exception as e:
            print(f"Neo4j Search Error: {e}")

    for drug in COMMON_DRUGS:
        if search_term in drug.lower() and drug.lower() not in seen:
            seen.add(drug.lower())
            matches.append(drug)
        if len(matches) >= limit:
            break

    if len(matches) < limit:
        for alias, canonical in DRUG_NAME_ALIASES.items():
            canonical_key = canonical.lower()
            if search_term in alias and canonical_key not in seen:
                seen.add(canonical_key)
                matches.append(canonical)
            if len(matches) >= limit:
                break

    return matches[:limit]


def normalize_drug_list(drugs: list[str]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for drug in drugs:
        canonical = canonicalize_drug_name(drug)
        if canonical:
            normalized.setdefault(canonical.lower(), canonical)
    return normalized


def append_interaction_if_missing(interactions: list[dict], next_interaction: dict) -> None:
    next_a = str(next_interaction.get("drug_a", "")).lower()
    next_b = str(next_interaction.get("drug_b", "")).lower()
    next_pair = tuple(sorted((next_a, next_b)))

    for interaction in interactions:
        current_pair = tuple(sorted((
            str(interaction.get("drug_a", "")).lower(),
            str(interaction.get("drug_b", "")).lower(),
        )))
        if current_pair == next_pair:
            return

    interactions.append(next_interaction)


def extract_drugs_from_context(clinical_context: str) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for term in DRUG_MATCH_TERMS:
        pattern = re.compile(rf"(?<!\w){re.escape(term)}(?!\w)", re.IGNORECASE)
        if not pattern.search(clinical_context):
            continue

        canonical = canonicalize_drug_name(term)
        if canonical and canonical.lower() not in seen:
            seen.add(canonical.lower())
            found.append(canonical)

    return found


def build_fallback_diagnoses(clinical_context: str) -> list[dict]:
    text = clinical_context.lower()
    diagnoses: list[dict] = []

    if any(term in text for term in ["burning urination", "urinary tract", "pus cells", "nitrite", "leukocyte esterase"]):
        diagnoses.append({
            "diagnosis_name": "Acute urinary tract infection",
            "icd11_code": "GC08",
            "probability_score": 0.82,
            "tags": ["LIKELY", "REVIEW"],
            "reasoning": "Burning urination with pyuria/nitrite or recurrent UTI history supports acute urinary tract infection. Assess for flank pain, persistent vomiting, high fever, or reduced urine output to rule out upper tract involvement.",
        })

    if any(term in text for term in ["vomiting", "dehydration", "nausea"]):
        diagnoses.append({
            "diagnosis_name": "Dehydration risk secondary to vomiting",
            "icd11_code": "5C70",
            "probability_score": 0.64,
            "tags": ["MONITOR"],
            "reasoning": "Vomiting and reduced oral intake can rapidly cause dehydration. Monitor urine output, orthostatic symptoms, electrolytes, and hydration response.",
        })

    if any(term in text for term in ["fever", "dry cough", "sore throat", "spo2"]):
        diagnoses.append({
            "diagnosis_name": "Acute respiratory tract infection",
            "icd11_code": "CA07",
            "probability_score": 0.7,
            "tags": ["RULE OUT"],
            "reasoning": "Fever with cough or sore throat is compatible with an acute respiratory infection. Low oxygen saturation or worsening breathlessness should trigger urgent evaluation.",
        })

    if any(term in text for term in ["diabetes", "rbs", "hyperglycemia", "metformin"]):
        diagnoses.append({
            "diagnosis_name": "Hyperglycemia risk during acute illness",
            "icd11_code": "5A11",
            "probability_score": 0.58,
            "tags": ["CHRONIC", "MONITOR"],
            "reasoning": "Diabetes or elevated random blood glucose increases risk during acute illness. Monitor glucose, hydration, and sick-day medication safety.",
        })

    if diagnoses:
        return diagnoses[:4]

    return [{
        "diagnosis_name": "Clinical syndrome under evaluation",
        "icd11_code": "MG22",
        "probability_score": 0.5,
        "tags": ["REVIEW"],
        "reasoning": "The available context requires clinician review. Add chief complaint, history, medications, vitals, and lab findings to improve AI specificity.",
    }]


def build_fallback_drug_safety(drugs: list[str], clinical_context: str) -> list[dict]:
    if not drugs:
        return [{
            "drug_a": "Medication list",
            "drug_b": "Clinical profile",
            "severity": "low",
            "mechanism": "No current medications were extracted from the clinical context.",
            "clinical_significance": "Drug safety review could not identify pairwise interactions without a medication list.",
            "alternative_suggested": "Confirm medication history manually before prescribing.",
        }]

    safety_notes: list[dict] = []
    normalized = normalize_drug_list(drugs)
    text = clinical_context.lower()

    for interaction in build_checker_fallback_interactions(drugs):
        append_interaction_if_missing(safety_notes, interaction)

    if "ondansetron" in normalized:
        append_interaction_if_missing(safety_notes, {
            "drug_a": normalized["ondansetron"],
            "drug_b": "QT-prolonging risk factors",
            "severity": "moderate",
            "mechanism": "Ondansetron may prolong QT interval, especially with electrolyte disturbance or other QT-prolonging drugs.",
            "clinical_significance": "Consider ECG/electrolyte review if persistent vomiting, dehydration, cardiac history, or macrolide/fluoroquinolone use is present.",
            "alternative_suggested": "Use the lowest effective dose and reassess need after vomiting improves.",
        })

    if "metformin" in normalized and any(term in text for term in ["vomiting", "dehydration", "infection", "creatinine"]):
        append_interaction_if_missing(safety_notes, {
            "drug_a": normalized["metformin"],
            "drug_b": "Acute illness/dehydration",
            "severity": "moderate",
            "mechanism": "Acute dehydration or renal impairment can increase metformin-associated lactic acidosis risk.",
            "clinical_significance": "Check renal function and consider sick-day guidance if oral intake is poor or vomiting persists.",
            "alternative_suggested": "Temporarily hold only if clinically appropriate and per local protocol.",
        })

    nsaid = next((normalized[name] for name in ["ibuprofen", "diclofenac"] if name in normalized), None)
    if nsaid and any(term in text for term in ["dehydration", "kidney", "hypertension", "vomiting"]):
        append_interaction_if_missing(safety_notes, {
            "drug_a": nsaid,
            "drug_b": "Renal/GI risk profile",
            "severity": "moderate",
            "mechanism": "NSAIDs can worsen renal perfusion and increase GI risk, especially with dehydration or kidney disease.",
            "clinical_significance": "Avoid or monitor carefully if dehydrated, hypertensive, or renal function is abnormal.",
            "alternative_suggested": "Consider paracetamol where appropriate.",
        })

    if not safety_notes and len(drugs) >= 2:
        safety_notes.append({
            "drug_a": drugs[0],
            "drug_b": drugs[1],
            "severity": "low",
            "mechanism": "No major interaction rule was triggered by the extracted medication list.",
            "clinical_significance": "Continue routine clinical monitoring and verify dose, allergies, renal function, and contraindications.",
            "alternative_suggested": None,
        })

    return safety_notes


def build_checker_fallback_interactions(drugs: list[str]) -> list[dict]:
    normalized = normalize_drug_list(drugs)
    interactions: list[dict] = []
    for seed in DRUG_GRAPH_SEED:
        drug_a = seed["drug_a"].lower()
        drug_b = seed["drug_b"].lower()
        if drug_a not in normalized or drug_b not in normalized:
            continue

        interactions.append({
            "drug_a": normalized[drug_a],
            "drug_b": normalized[drug_b],
            "severity": seed["severity"],
            "mechanism": seed["mechanism"],
            "clinical_significance": seed["clinical_significance"],
            "alternative_suggested": seed["alternative_suggested"],
        })

    return interactions


def fetch_qdrant_context(query_text: str) -> str:
    """Attempts to fetch real embeddings from Qdrant via FastEmbed."""
    if not qdrant_client:
        return "Guideline context unavailable. Qdrant disconnected."
        
    try:
        search_result = qdrant_client.query(
            collection_name="clinical_guidelines",
            query_text=query_text,
            limit=3
        )
        
        if len(search_result) > 0:
            return " ".join([hit.metadata.get('text', '') for hit in search_result])
        else:
            return "No matching guidelines found in Qdrant. DB is empty but connection is live."
            
    except Exception as e:
        print(f"Qdrant Context Error: {e}")
        return "Guideline context unavailable due to retrieval error."


async def run_diagnostic_pipeline(clinical_context: str) -> AsyncGenerator[dict, None]:
    """
    Real LangChain-Groq multi-agent pipeline returning structured diagnostics via SSE events.
    """
    
    # 1. Inform client we are searching Qdrant vector DB
    yield {"event": "thinking", "data": json.dumps({"message": "RAG: Querying Qdrant fastembed vectors...", "step": 1})}
    await asyncio.sleep(0.5)
    
    # Fetch from Qdrant locally
    qdrant_context = fetch_qdrant_context(clinical_context)

    yield {"event": "thinking", "data": json.dumps({"message": "Agent: Reasoning through clinical presentation with Llama-3...", "step": 2})}
    
    diagnoses = []
    extracted_drugs = extract_drugs_from_context(clinical_context)

    if ChatGroq is not None and PromptTemplate is not None and GROQ_API_KEY:
        llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.1)

        prompt = PromptTemplate.from_template('''
        You are an expert AI clinical decision support system (MedCoPilot).
        Given the following clinical context and medical guidelines, generate a differential diagnosis.
        You must output exactly valid JSON format, containing a list of diagnosis objects and a list of drugs found in the context.

        Clinical Context from Doctor: {context}
        Medical RAG Context: {rag_context}

        Output JSON format:
        {{
          "diagnoses": [
            {{
              "diagnosis_name": "String",
              "icd11_code": "String code",
              "probability_score": float (0-1),
              "tags": ["URGENT", "RULE OUT", etc],
              "reasoning": "String"
            }}
          ],
          "extracted_drugs": ["DrugName1", "DrugName2"]
        }}

        Output nothing but the JSON block. Do not include markdown formatting like ```json.
        ''')

        try:
            chain = prompt | llm
            response = await chain.ainvoke({"context": clinical_context, "rag_context": qdrant_context})

            # Parse JSON output resiliently
            raw_output = response.content.strip()
            if raw_output.startswith("```json"):
                raw_output = raw_output[7:-3].strip()
            elif raw_output.startswith("```"):
                raw_output = raw_output[3:-3].strip()

            data = json.loads(raw_output)

            diagnoses = data.get("diagnoses", [])
            extracted_drugs = data.get("extracted_drugs", []) or extracted_drugs

        except Exception as e:
            print(f"LLM parsing error: {e}")
            yield {"event": "thinking", "data": json.dumps({"message": "LLM response could not be parsed. Using safe clinical fallback...", "step": 3})}
    else:
        yield {"event": "thinking", "data": json.dumps({"message": "Groq LLM unavailable. Using safe clinical fallback...", "step": 3})}

    if not diagnoses:
        diagnoses = build_fallback_diagnoses(clinical_context)
        extracted_drugs = extracted_drugs or extract_drugs_from_context(clinical_context)
        
    # 3. Stream diagnoses to the client
    for d in diagnoses:
        await asyncio.sleep(0.3) 
        yield {"event": "diagnosis_card", "data": json.dumps(d)}
        
    # 4. Check Drug Interactions
    yield {"event": "thinking", "data": json.dumps({"message": "Graph: Checking Neo4j interactions...", "step": 3})}
    
    interactions = await check_drug_interactions(extracted_drugs)
    if not interactions:
        interactions = build_fallback_drug_safety(extracted_drugs, clinical_context)
    
    yield {"event": "interaction_check", "data": json.dumps(interactions)}


async def create_patient_node(patient_id: str, name: str, age: int, sex: str):
    """Creates or updates a Patient node in Neo4j."""
    if not driver:
        return {"success": False, "warning": "Neo4j graph write skipped."}
    
    query = """
    MERGE (p:Patient {id: $pid})
    SET p.name = $name,
        p.age = $age,
        p.sex = $sex,
        p.status = 'WAITING'
    RETURN p
    """
    try:
        async with driver.session() as session:
            await session.run(query, pid=patient_id, name=name, age=age, sex=sex)
        return {"success": True}
    except Exception as e:
        message = str(e)
        print(f"Neo4j Patient Write Error: {message}")
        return {"success": False, "warning": "Neo4j graph write skipped because the database is unavailable."}


async def upsert_patient_context(patient_id: str, clinical_text: str):
    """Embeds and stores clinical text into Qdrant for RAG."""
    if not qdrant_client or not clinical_text.strip():
        return {"success": False, "warning": "Vector index write skipped."}
    
    collection_name = "patient_records"
    
    try:
        qdrant_client.add(
            collection_name=collection_name,
            documents=[clinical_text],
            metadata=[{"patient_id": patient_id}],
            ids=[str(uuid.uuid4())],
        )
        return {"success": True}
    except Exception as e:
        message = str(e)
        print(f"Qdrant Upsert Error: {message}")
        return {"success": False, "warning": "Vector index write skipped because Qdrant is unavailable."}

async def delete_patient(patient_id: str):
    """Deletes Patient from Neo4j and their embeddings from Qdrant."""
    error = None
    
    if driver:
        query = "MATCH (p:Patient {id: $pid}) DETACH DELETE p"
        try:
            async with driver.session() as session:
                await session.run(query, pid=patient_id)
        except Exception as e:
            print(f"Neo4j Delete Error: {e}")
            error = str(e)
            
    if qdrant_client:
        try:
            from qdrant_client.http import models
            qdrant_client.delete(
                collection_name="patient_records",
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="patient_id",
                                match=models.MatchValue(value=patient_id),
                            ),
                        ]
                    )
                ),
            )
        except Exception as e:
            err_str = str(e)
            if "Not found" not in err_str and "404" not in err_str:
                print(f"Qdrant Delete Error: {err_str}")
                error = (error + " | " + err_str) if error else err_str
            
    return {"success": error is None, "error": error}
