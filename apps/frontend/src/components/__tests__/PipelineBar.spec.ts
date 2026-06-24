import { mount } from '@vue/test-utils';
import PipelineBar from '@/components/PipelineBar.vue';

describe('PipelineBar', () => {
  it('renders stages with correct status classes', () => {
    const stages = [
      { stage: 'source_ingested', status: 'success' as const },
      { stage: 'requirements_extracted', status: 'running' as const },
      { stage: 'test_plan_created', status: 'success' as const },
    ];
    const wrapper = mount(PipelineBar, { props: { stages } });

    const nodes = wrapper.findAll('.stage-node');
    expect(nodes).toHaveLength(3);

    expect(nodes[0].classes()).toContain('status-success');
    expect(nodes[1].classes()).toContain('status-running');
    expect(nodes[2].classes()).toContain('status-success');
  });

  it('renders connectors between stages', () => {
    const stages = [
      { stage: 'source_ingested', status: 'success' as const },
      { stage: 'requirements_extracted', status: 'running' as const },
      { stage: 'test_plan_created', status: 'success' as const },
    ];
    const wrapper = mount(PipelineBar, { props: { stages } });

    const connectors = wrapper.findAll('.stage-connector');
    expect(connectors).toHaveLength(2);
  });

  it('formats stage names correctly', () => {
    const stages = [
      { stage: 'requirements_extracted', status: 'success' as const },
      { stage: 'dry_run_completed', status: 'success' as const },
    ];
    const wrapper = mount(PipelineBar, { props: { stages } });

    const labels = wrapper.findAll('.stage-label');
    expect(labels[0].text()).toBe('Requirements');
    expect(labels[1].text()).toBe('Dry Run');
  });

  it('renders spinning icon for running stage', () => {
    const stages = [
      { stage: 'source_ingested', status: 'running' as const },
    ];
    const wrapper = mount(PipelineBar, { props: { stages } });

    const icon = wrapper.find('.spinning');
    expect(icon.exists()).toBe(true);
  });

  it('renders paused icon for waiting/blocked stage', () => {
    const stages = [
      { stage: 'review', status: 'paused' as const },
    ];
    const wrapper = mount(PipelineBar, { props: { stages } });

    const node = wrapper.find('.stage-node');
    expect(node.classes()).toContain('status-paused');

    const svg = wrapper.find('.stage-icon');
    expect(svg.html()).toContain('line');
  });

  it('renders success checkmark for completed stage', () => {
    const stages = [
      { stage: 'source_ingested', status: 'success' as const },
    ];
    const wrapper = mount(PipelineBar, { props: { stages } });

    const svg = wrapper.find('.stage-icon');
    expect(svg.html()).toContain('checkmark');
  });
});
